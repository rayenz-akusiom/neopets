// ==UserScript==
// @name         Improved Training Schools <Rayenz>
// @description  Adds some much needed useability functions to the training school(s)
// @namespace    http://tampermonkey.net/
// @version      2024-04-08
// @description  try to take over the world!
// @author       rayenz-akusiom
// @match        https://www.neopets.com/pirates/academy.phtml?type=status
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// ==/UserScript==

/**
 * Feature List:
 * 
 * - Works in Swashbuckling *only* for now
 * - HSD Replaces Level in Pet Titles
 * - Order by HSD (default DESC)
 * - Pushes Graduates (overleveled) pets to bottom of list
 */

/**
* Ideas:
* Sort by HSD - Done
* Reverseable Sort? - Done as an Option, button for later.
* Elevate Finished Training to the top
* Combine status and course page
* Hide or drop to bottom graduates (based on level iirc?) - Done
*  - Still need to give a different treatment of some kind (locked treatment?)
* Training suggestions (for efficient training)
* Lock training for "done" pets (ex: Gal is L54)
* Needs to work for all three training schools (or at least one script per?)
**/

let OPT_REPLACE_PET_TABLE = true; // Controls whether or not this script replaces the UI. Break in case of emergency, basically.
let OPT_SORT_ORDER = "DESC"; // Valid options are ASC or DESC
let GRADUATE_LEVEL = 40; // Level pets graduate from training

let petData = getPets();
replacePetTable(petData);

function replacePetTable(petData){
    if (!OPT_REPLACE_PET_TABLE){
        return;
    }
    let petTable = document.getElementsByTagName("table")[8];
    petTable.innerHTML = "";
    for (const [petName, petStats] of petData.entries()){
        //Name Row
        let nameRow = petTable.insertRow();
        let nameCell = nameRow.insertCell();
        nameCell.style.backgroundColor = "#efefef";
        nameCell.style.width = 450;
        nameCell.colSpan = 2;
        nameCell.innerHTML = petStats.petTitle;

        // Status Row
        let statusRow = petTable.insertRow();
        let statusCell = statusRow.insertCell();
        statusCell.style.backgroundColor = "white";
        statusCell.style.width = 250;
        statusCell.style.textAlign = "center";
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

        let progressCell = statusRow.insertCell();
        progressCell.width = 250;
        progressCell.style.textAlign = "center";
        progressCell.innerHTML = petStats.petProgress;
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
            // Get Pet Progress from next row
            petStats.petProgress = nextRow.cells[1].innerHTML;
            // Push to array
            petStatsMap.set(petName, petStats);
        }
    }

    return sortPetMap(petStatsMap);
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

    // Suppress graduates
    if (OPT_SORT_ORDER == "DESC") {
        // Push "Graduates" to the bottom:
        for(let pet of sortedArray){
            if(pet[1].level > GRADUATE_LEVEL) {
                sortedArray.push(sortedArray.shift());
            }
        }
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

function printArrayInnerHTML(arr) {
    arr.forEach((element) => console.log(element.innerHTML));
}

function printMapInnerHTML(arr) {
    arr.forEach((key, value) => console.log(key + ": " + value.innerHTML));
}