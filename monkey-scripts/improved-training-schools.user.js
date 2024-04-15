// ==UserScript==
// @name         Improved Training Schools <Rayenz>
// @description  Adds some much needed useability functions to the training school(s). **Tested in Chrome only!**
// @namespace    http://tampermonkey.net/
// @version      2024-04-08
// @author       rayenz-akusiom
// @match        https://www.neopets.com/pirates/academy.phtml?type=status
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

/**
 * Feature List:
 *
 * - Works in Swashbuckling *only* for now
 * - HSD Replaces Level in Pet Titles
 * - Order by HSD (default DESC)
 * - Added lock functionality to prevent accidental interaction with "finished" pets
 * - Pushes Graduates (overleveled) and manually locked pets to bottom of list
 */

/**
* Ideas:
* Reverseable Sort? - Done as an Option, button for later.
* Elevate Finished Training to the top
* Combine status and course page
* Give each pet a "badge" (dubloon) for training costs
* Hide or drop to bottom graduates (based on level iirc?) - Done
*  - Still need to give a different treatment of some kind (locked treatment?)
* Training suggestions (for efficient training)
* Needs to work for all three training schools (or at least one script per?)
**/

/**
* Options
**/
const OPT_REPLACE_PET_TABLE = true; // Controls whether or not this script replaces the UI. Break in case of emergency, basically.
const OPT_SORT_ORDER = "DESC"; // Valid options are ASC or DESC
const OPT_LOCKING = true; // Enables the locking feature

/**
* Settings
**/
const GRADUATE_LEVEL = 40; // Level pets graduate from training

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
setUpClasses();
let petData = getPets();
replacePetTable(petData);

function replacePetTable()
{
    if (!OPT_REPLACE_PET_TABLE){
        return;
    }

    let petTable = document.getElementById("content");
    let containerLocation = petTable.getElementsByTagName("p")[3];
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
        nameRow.appendChild(nameCell);

        // Status Row
        let statusCell = document.createElement("div");
        petContainer.appendChild(statusCell);
        statusCell.classList.add("status-cell");
        statusCell.innerHTML =
            `
          <img src="//pets.neopets.com/cpn/${petName}/1/2.png" width="150" height="150" border="0">
          <br>
          Lvl : <font color="green"><b>${petStats.level}</b></font>
          <br>
          Hp : <b>${petStats.hp}</b>
          <br>
          Str : <b>${petStats.strength}</b>
          <br>
          Def : <b>${petStats.defence}</b>
          <br>
          <br>
          `;

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
        petContainer.classList.add(petStats.locked ? "locked" : "unlocked");
    }
}

function getPets() {
    let petTable = document.getElementsByTagName("table")[8];
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

    //Lock Graduates
    if (petStats.level > GRADUATE_LEVEL){
        return true;
    }

    return false;
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

    // Suppress locked pets
    if (OPT_SORT_ORDER == "DESC") {
        let elevatedPets = [];
        let noChangesPets = [];
        let suppressedPets = [];
        for(let pet of sortedArray){
            if(pet[1].locked) {
                suppressedPets.push(pet);
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
        speed: Number(rawStats[3].innerHTML),
        hp: Number(rawStats[4].innerHTML.split("/")[1]),
    }
    stats.hsd = stats.hp + Math.min(stats.strength, 750) + Math.min(stats.defence, 750);
    return stats;
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
      }`
    ;
}

function getLockIcon(locked){
    return locked ? LOCKED_ICON : UNLOCKED_ICON;
}