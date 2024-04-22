// ==UserScript==
// @name         Improved Training Schools <Rayenz>
// @description  Adds some much needed useability functions to the training school(s). **Tested in Chrome only!**
// @namespace    http://tampermonkey.net/
// @version      2024-04-22
// @author       rayenz-akusiom
// @match        *://*.neopets.com/pirates/academy.phtml?type=status*
// @match        *://*.neopets.com/island/*training.phtml?*type=status*
// @match        *://*.neopets.com/island/*fight_training.phtml?*type=status*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

/**
 * Feature List:
 *
 * - Works in all training schools!
 * - HSD Replaces Level in Pet Titles
 * - Order by HSD (default DESC)
 * - Added lock functionality to prevent accidental interaction with "finished" pets
 * - Pushes Graduates (overleveled) and manually locked pets to bottom of list
 * - Pushes pets awaiting payment, have training in process or have completed training to the top of the list
 * - Badges that show the cost of your course.
 * - Will suggest which stat to train.
 * - Enroll and Pay from the same page
 */

/**
* Ideas:
* Reverseable Sort? - Done as an Option, button for later.
* Make nicer to look at (Cards?)
**/

/**
* Options
**/
const OPT_REPLACE_PET_TABLE = true; // Controls whether or not this script replaces the UI. Break in case of emergency, basically.
const V2_UI = true; // Controls if it uses the nicer UI or not.
const OPT_SORT_ORDER = "DESC"; // Valid options are ASC or DESC
const OPT_LOCKING = true; // Enables the locking feature

/**
* Badges
**/
const BADGE_GRADUATE = 'https://images.neopets.com/items/clo_grad_vanda_hat.gif';

/**
 * School Settings (to help with the different schools)
 */
const SCHOOL_SETTINGS = new Map();
const SCHOOL_SWASHBUCKLING = "swashbuckling";
SCHOOL_SETTINGS.set(SCHOOL_SWASHBUCKLING, {
    schoolName: SCHOOL_SWASHBUCKLING,
    url: "pirates/academy.phtml",
    courseSubmitUrl: "/pirates/process_academy.phtml",
    graduateLevel: 40,
    tiers: [
        { cost: "Graduated!", image: BADGE_GRADUATE},
        { cost: "Five Dubloon Coin", image: 'https://images.neopets.com/items/dubloon3.gif', maxLevel: 40},
        { cost: "Five Dubloon Coin", image: 'https://images.neopets.com/items/dubloon3.gif', maxLevel: 30},
        { cost: "Two Dubloon Coin", image: 'https://images.neopets.com/items/dubloon2.gif', maxLevel: 20},
        { cost: "One Dubloon Coin", image: 'https://images.neopets.com/items/dubloon1.gif', maxLevel: 10}
    ],
    hpMult: 2,
    petTableIndex: 3
});
const SCHOOL_ISLAND = "island";
SCHOOL_SETTINGS.set(SCHOOL_ISLAND, {
    schoolName: SCHOOL_ISLAND,
    url: "island/training.phtml",
    courseSubmitUrl: "/island/process_training.phtml",
    graduateLevel: 250,
    tiers: [
        { cost: "Graduated!", image: BADGE_GRADUATE},
        { cost: "8 Tan Codestones", image: 'https://images.neopets.com/items/codestone5.gif', maxLevel: 250},
        { cost: "7 Tan Codestones", image: 'https://images.neopets.com/items/codestone2.gif', maxLevel: 200},
        { cost: "6 Tan Codestones", image: 'https://images.neopets.com/items/codestone3.gif', maxLevel: 150},
        { cost: "5 Tan Codestones", image: 'https://images.neopets.com/items/codestone4.gif', maxLevel: 120},
        { cost: "4 Tan Codestones", image: 'https://images.neopets.com/items/codestone6.gif', maxLevel: 100},
        { cost: "3 Tan Codestones", image: 'https://images.neopets.com/items/codestone7.gif', maxLevel: 80},
        { cost: "2 Tan Codestones", image: 'https://images.neopets.com/items/codestone8.gif', maxLevel: 40},
        { cost: "1 Tan Codestone", image: 'https://images.neopets.com/items/codestone1.gif', maxLevel: 20}
    ],
    hpMult: 3,
    petTableIndex: 3
});
const SCHOOL_NINJA = "ninja";
SCHOOL_SETTINGS.set(SCHOOL_NINJA, {
    schoolName: SCHOOL_NINJA,
    url: "island/fight_training.phtml",
    courseSubmitUrl: "/island/process_fight_training.phtml",
    graduateLevel: null,
    tiers: [
        { cost: "6 Red Codestones", image: 'https://images.neopets.com/items/codestone16.gif', maxLevel: null},
        { cost: "5 Red Codestones", image: 'https://images.neopets.com/items/codestone15.gif', maxLevel: 750},
        { cost: "4 Red Codestones", image: 'https://images.neopets.com/items/codestone14.gif', maxLevel: 600},
        { cost: "3 Red Codestones", image: 'https://images.neopets.com/items/codestone13.gif', maxLevel: 500},
        { cost: "2 Red Codestones", image: 'https://images.neopets.com/items/codestone12.gif', maxLevel: 400},
        { cost: "1 Red Codestone", image: 'https://images.neopets.com/items/codestone11.gif', maxLevel: 300}
    ],
    hpMult: 3,
    petTableIndex: 5
});

/**
* Other globals
**/
const LOCKED_ICON = "&#128274;"
const UNLOCKED_ICON = "&#128275;"

/**
* Monkey Storage
**/
const PET_STORAGE = "petStorage";
let petStorage = new Map();
if (GM_getValue(PET_STORAGE)){
    petStorage = new Map(JSON.parse(GM_getValue(PET_STORAGE)));
}

/**
* Main
**/
const SCHOOL = detectSchool();
setUpClasses();

if (document.readyState !== 'loading') {
    replacePetTable(getPets(document));
    return;
  }
  else {
    document.addEventListener('DOMContentLoaded', replacePetTable(getPets(document)));
}

function replacePetTable(petData)
{
    if (!OPT_REPLACE_PET_TABLE){
        return;
    }

    // Of course one of the pages would have extra empty paragraphs...
    let petTable = document.getElementById("content");
    let containerLocation = petTable.getElementsByTagName("p")[SCHOOL.petTableIndex];
    containerLocation.innerHTML = "";

    let petOuterContainer = document.createElement("div");
    containerLocation.appendChild(petOuterContainer);
    petOuterContainer.classList.add("training-outer-container");

    for (const [petName, petStats] of petData.entries()){
        let petContainer = document.createElement("div");
        petContainer.id = `petContainer-${petName}`;
        petContainer.classList.add("pet-container");
        petOuterContainer.appendChild(petContainer);

        //Name Row
        let nameRow = document.createElement("div");
        nameRow.classList.add( "name-cell" );
        petContainer.appendChild(nameRow);

        let nameCell = document.createElement("div")
        nameCell.innerHTML = petStats.petTitle;
        nameCell.id = `pet-title-${petName}`;
        nameRow.appendChild(nameCell);

        // Status Row
        let statusCell = document.createElement("div");
        petContainer.appendChild(statusCell);
        statusCell.classList.add("status-cell");
        statusCell.innerHTML =
            `
          <img src="//pets.neopets.com/cpn/${petName}/1/2.png" width="150" height="150" border="0">
          <div class="petStats-stats" id="petStats-container-${petName}">
            <div class="petStats-row" id="cost-${petName}">
                <div class="petStats-badge-icon" id="enroll-badge-${petName}"></div>
                <div class="petStats-details" id="enroll-cost-${petName}"><b>${petStats.badge.cost}</b></div>
            </div>
            <div class="petStats-row" id="level-${petName}">
                <div class="petStats-level-icon"></div>
                <div class="petStats-details" id="enroll-level-${petName}">Lvl : <font color="green"><b>${petStats.level}</b></font></div>
            </div>
            <div class="petStats-row" id="hp-${petName}">
                <div class="petStats-hp-icon"></div>
                <div class="petStats-details" id="enroll-hp-${petName}">Hp : <b>${petStats.hp}</b></div>
            </div>
            <div class="petStats-row" id="strength-${petName}">
                <div class="petStats-strength-icon"></div>
                <div class="petStats-details" id="enroll-strength-${petName}">Str : <b>${petStats.strength}</b></div>
            </div>
            <div class="petStats-row" id="defence-${petName}">
                <div class="petStats-defence-icon"></div>
                <div class="petStats-details" id="enroll-defence-${petName}">Def : <b>${petStats.defence}</b></div>
            </div>
          </div>
          `;

        // Update the background image for the cost badge
        const badgeIcon = document.getElementById(`enroll-badge-${petName}`);
        badgeIcon.style.backgroundImage = `url(${petStats.badge.image}`;

        // Update the background color for the recommended stat
        formatRecommendedStat(petStats);

        // Only set up the enrollment behaviour if there's no progress being reported.
        if (petStats.petProgress.trim().length === 0){
            let statDivs = [];
            let levelDiv = document.getElementById(`enroll-level-${petName}`);
            levelDiv.addEventListener("click", function() {submitCourse(petName, "Level")});
            statDivs.push(levelDiv);
            let healthDiv = document.getElementById(`enroll-hp-${petName}`);
            healthDiv.addEventListener("click", function() {submitCourse(petName, "Endurance")});
            statDivs.push(healthDiv);
            let strengthDiv = document.getElementById(`enroll-strength-${petName}`);
            strengthDiv.addEventListener("click", function() {submitCourse(petName, "Strength")});
            statDivs.push(strengthDiv);
            let defenceDiv = document.getElementById(`enroll-defence-${petName}`);
            defenceDiv.addEventListener("click", function() {submitCourse(petName, "Defence")});
            statDivs.push(defenceDiv);

            for (let statDiv of statDivs){
                statDiv.onmouseover = function() {mouseOver(statDiv)};
                statDiv.onmouseout = function() {mouseOut(statDiv)};
            }
        }

        let progressCell = document.createElement("div");
        petContainer.appendChild(progressCell);
        progressCell.id = `progressCell-${petName}`;
        progressCell.classList.add("status-cell");
        progressCell.inert = petStats.locked;
        progressCell.innerHTML = petStats.petProgress;

        // Lock Button
        let lockButton = document.createElement("button");
        let lockCell = document.createElement("div");
        lockButton.innerHTML = getLockIcon(petStats.locked);
        lockButton.addEventListener("click", function() {togglePetLock(lockButton, petName)});
        lockCell.classList.add("lock-container");
        lockCell.appendChild(lockButton);
        nameRow.appendChild(lockCell);
        petContainer.classList.add(petStats.locked || hasGraduated(petStats) ? "locked" : "unlocked");
    }
}

function getPets(pageHandle) {
    let petTable = pageHandle.getElementsByTagName("table")[8];
    let petStatsMap = new Map();
    for (var i = 0; i < petTable.rows.length; i++) {
        let row = petTable.rows[i];
        if (i % 2 == 0){
            // This is a pet header
            let petTitle = row.cells[0].innerHTML;
            let petName = petTitle.substring(3).split(" ")[0];
            let nextRow = petTable.rows[i+1];
            // Get Pet Stats from next row
            let petStats = getPetStats(nextRow.cells[0]);

            // Fill in the title for later
            petStats.petTitle = reformatPetTitle(petStats, petTitle);
            petStats.name = petName;

            // Get Pet Progress from next row
            petStats.petProgress = nextRow.cells[1].innerHTML;

            // Apply locking state
            petStats.locked = shouldLockPet(petStats);

            // Figure out their badge
            petStats.badge = determineBadge(petStats);

            // Push to array
            petStatsMap.set(petName, petStats);
        }
    }

    // Sort the map and store it
    let sortedPetStatsMap = sortPetMap(petStatsMap);
    storeMonkeyMap(PET_STORAGE, sortedPetStatsMap);

    return sortedPetStatsMap;
}

function shouldLockPet(petStats){
    // Locked Pets
    if (petStorage.get(petStats.name) && petStorage.get(petStats.name).locked){
        return true;
    }

    return false;
}

function determineBadge(petStats){
    let badge = SCHOOL.tiers[0];
    if (hasGraduated(petStats)){
        return badge;
    }

    for (let i = 1; i < SCHOOL.tiers.length; i++){
        if (petStats.level <= SCHOOL.tiers[i].maxLevel){
            badge = SCHOOL.tiers[i];
        }
        else {
            return badge;
        }
    }

    return badge;
}

function submitCourse(petName, stat){
    // Construct a FormData instance
    const formData = new FormData();

    // Add a text field
    formData.append("type", "start");
    formData.append("course_type", stat);
    formData.append("pet_name", petName);

    $.ajax({
        type: "POST",
        url: SCHOOL.courseSubmitUrl,
        data: `type=start&course_type=${stat}&pet_name=${petName}`,
        timeout: 6000,
        success: function(data) {
            let dataWrapper = document.createElement("div");
            dataWrapper.innerHTML = data;
            let petData = getPets(dataWrapper);
            let progessCellToUpdate = document.getElementById(`progressCell-${petName}`);
            progessCellToUpdate.innerHTML = petData.get(petName).petProgress;
            let nameCellToUpdate = document.getElementById(`pet-title-${petName}`);
            nameCellToUpdate.innerHTML = petData.get(petName).petTitle;
        },
        error: function(xhr, status, error) {
            console.log(status + error)
        }
    })
}

function togglePetLock(lockButton, petName){
    let petStats = petStorage.get(petName);
    petStats.locked = !petStats.locked;
    petStorage.set(petName, petStats);
    storeMonkeyMap(PET_STORAGE, petStorage);

    // Change the lock button
    lockButton.innerHTML = getLockIcon(petStats.locked);

    // Update the treatment for the petContainer
    const petContainer = document.getElementById(`petContainer-${petName}`);
    petContainer.classList.add(petStats.locked ? "locked" : "unlocked");
    petContainer.classList.remove(petStats.locked ? "unlocked" : "locked");

    // Progress Cell needs to change inertness (can't do this at container level because of the lock button)
    const progressCell = document.getElementById(`progressCell-${petName}`);
    progressCell.inert = petStats.locked;
}

function storeMonkeyMap(key, mapToStore){
    GM_setValue(key, JSON.stringify(Array.from(mapToStore.entries())));
}

function sortPetMap(mapToSort){
    let sortedArray = Array.from(mapToSort);

    // Sort by HSD first
    if (OPT_SORT_ORDER == "DESC"){
        sortedArray = sortedArray.sort((firstPet, secondPet) => secondPet[1].hsd - firstPet[1].hsd);
    }
    else {
        sortedArray = sortedArray.sort((firstPet, secondPet) => firstPet[1].hsd - secondPet[1].hsd);
    }

    // Suppress locked && graduated pets
    if (OPT_SORT_ORDER == "DESC") {
        let elevatedPets = [];
        let noChangesPets = [];
        let suppressedPets = [];
        for(let pet of sortedArray){
            if(pet[1].locked || hasGraduated(pet[1])) {
                suppressedPets.push(pet);
            }
            else if (pet[1].petProgress.trim().length > 0)
            {
                elevatedPets.push(pet);
            }
            else {
                noChangesPets.push(pet);
            }
        }

        sortedArray = elevatedPets.concat(noChangesPets).concat(suppressedPets);
    }

    return new Map(sortedArray);
}

function reformatPetTitle(petStats, petTitle){
    let petTitleTokens = petTitle.split(" ");
    petTitleTokens.splice(1, 2, `(<b>${petStats.hsd} HSD)</b>`);
    let reformattedTitle = petTitleTokens.join(' ').trim();

    return reformattedTitle;
}

function getPetStats(petCell){
    let rawStats = Array.from(petCell.getElementsByTagName("b"));
    let stats = {
        level: Number(rawStats[0].innerHTML),
        strength: Number(rawStats[1].innerHTML),
        defence: Number(rawStats[2].innerHTML),
        hp: Number(rawStats[4].innerHTML.split("/")[1]),
    }

    // Figure out the next stat
    stats.recommendNext = recommendNext(stats);

    // HSD
    stats.hsd = stats.hp + Math.min(stats.strength, 750) + Math.min(stats.defence, 750);

    return stats;
}

/**
 * Decided to only ever recommend even training, if you want to do something else you won't be blocked unless you've already graduated anyways.
 * This also means we're ignoring the 3x hp bonus in all schools.
 */
function recommendNext(petStats){
    if (!hasGraduated(petStats)){
        if (highestStat(petStats) === "level"){
            return "level";
        }
    
        return lowestStat(petStats);
    }

    return "NONE";
}

function hasGraduated(petStats){
    return SCHOOL.graduateLevel && petStats.level > SCHOOL.graduateLevel;
}

function highestStat(petStats){
    return findOutlier("max", petStats);
}

function lowestStat(petStats){
    return findOutlier("min", petStats);
}

function findOutlier(mode, petStats){
    let outlierKey = "hp";
    let outlierValue = petStats.hp;
    for (const [key, stat] of Object.entries(petStats)) {
        // Endurance and level are uncapped, and level will be decided later
        if (key === "level" || ((key !== "hp" && stat > 750))){
            continue;
        }

        if (mode === "min" ? stat < outlierValue : stat > outlierValue){
            outlierKey = key;
            outlierValue = stat;
        }
    }

    // You always need to level first if the outlier is too big, but if it's hp the multiplier is different.
    if (outlierKey === "hp" && petStats.level < outlierValue / SCHOOL.hpMult 
        || (outlierKey !== "hp" && petStats.level < outlierValue / 2)){
        outlierKey = "level";
        outlierValue = petStats.level;
    }

    return outlierKey;
}

function formatRecommendedStat(petStats){
    const recommendedStat = document.getElementById(`${petStats.recommendNext}-${petStats.name}`)
    if (recommendedStat){
        recommendedStat.classList.add("recommended-stat");
    }
}

function formatStat(key, petStats){
    if (key === petStats.recommendNext){
        return `&gt;${petStats[key]}&lt;`;
    }
    else{
        return petStats[key];
    }
}

function detectSchool(){
    if (document.URL.includes(SCHOOL_SETTINGS.get(SCHOOL_ISLAND).url)){
        return SCHOOL_SETTINGS.get(SCHOOL_ISLAND);
    }
    else if (document.URL.includes(SCHOOL_SETTINGS.get(SCHOOL_NINJA).url)){
        return SCHOOL_SETTINGS.get(SCHOOL_NINJA);
    }
    
    return SCHOOL_SETTINGS.get(SCHOOL_SWASHBUCKLING);
}

function mouseOver(element) {
    element.classList.add("stat-hover");
}

function mouseOut(element) {
    element.classList.remove("stat-hover");
}

function setUpClasses(){
    let styleTag = document.getElementsByTagName("style")[0];
    styleTag.innerHTML += " .locked { background-color: #efefef; } ";
    styleTag.innerHTML += " .unlocked { background-color: white; } ";
    styleTag.innerHTML +=
        ` .training-outer-container {
           display: block;
           width: 500;
           margin: auto;
           padding: 0;
      }
      .pet-container {
           display: grid;
           grid-template-columns: repeat(2, 50%);
           grid-gap: 0;
           margin: 0;
           padding: 0;
           align-items: center;
           grid-template-rows: 1fr min-content;
      }
      .name-cell {
         background-color: #efefef;
         text-align: left;
         grid-column: span 2;
         padding: 3px;
         justify-items: left;
         align-items: center;
         display: grid;
         grid-template-columns: auto min-content;
      }
      .status-cell {
         text-align: center;
         justify-items: center;
         padding: 3px;
      }
      .lock-container {
        text-align: right;
        padding: 3px;
      }
      .stat-hover {
       color: red;
      }
      .petStats-hp-icon {
        background-image: url(https://images.neopets.com/themes/h5/basic/images/health-icon.png);
      }
      .petStats-defence-icon {
        background-image: url(https://images.neopets.com/items/armorednegg.gif);
      }
      .petStats-strength-icon {
        background-image: url(https://images.neopets.com/themes/h5/basic/images/equip-icon.png);
      }
      .petStats-level-icon {
        background-image: url(https://images.neopets.com/themes/h5/basic/images/level-icon.png);
      }
      .petStats-details {
        padding-top: 7px;
        padding-bottom: 7px;
        text-align: left;
      } 
      .petStats-stats {
        margin: 15px auto 10px;
        width: 90%;
        height: auto;
        box-sizing: border-box;
        padding: 10px;
        border-radius: 15px;
        background-color: #E6E4DD;
        display: block
      }
      .petStats-row {
        margin: 3px auto 3px;
        width: 90%;
        height: 30px;
        border-radius: 15px;
        box-sizing: border-box;
        display: grid;
        grid-template-columns: auto 90%;
        grid-gap: 3px;
        font-size: 10pt;
        text-align: left;
        background-color: white;
      }
      .petStats-hp-icon, .petStats-strength-icon, .petStats-level-icon, .petStats-defence-icon, .petStats-badge-icon {
        height: 30px;
        width: 30px;
        border-radius: 50%;
        border: 3px solid #DFC5FE;
        background-color: white;
        background-position: center;
        background-size: 90%;
        background-repeat: no-repeat;
      }
      .recommended-stat{
        background-color: #90EE90
      }
      `
    ;
}

function getLockIcon(locked){
    return locked ? LOCKED_ICON : UNLOCKED_ICON;
}