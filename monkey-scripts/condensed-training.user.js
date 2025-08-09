// ==UserScript==
// @name         Training Center <Rayenz Edit>
// @namespace    neopets.training
// @version      2025-04-26
// @description  Highly condenses Training into the Status Page. (v2.1)
// @author       rayenz-akusiom
// @match        https://www.neopets.com/island/training.phtml?type=status*
// @match        https://www.neopets.com/pirates/academy.phtml?type=status*
// @match        https://www.neopets.com/island/fight_training.phtml?status*
// @match        https://www.neopets.com/safetydeposit.phtml?obj_name=&category=2
// @match        https://www.neopets.com/safetydeposit.phtml?obj_name=&category=3
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @run-at       document-body
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

const CONFIG = {
    // Number of Columns. 5 is the max that fits "nicely". 3-5 all work well.
    columns: 5,
    // Whether to add Shop Wizard button next to Codestone/Dubloons
    shopWizardBtn: true,
    // Whether to add Safety Deposit Box button next to Codestone/Dubloons
    sdbBtn: true,
    // Background Colors to apply to the status area depending on context.
    // Must be CSS colors.
    statusColor: {
        notTraining: 'lightgray',
        needsPayment: 'indianred',
        inProgress: 'moccasin',
        complete: 'lightgreen',
    },

    // Border of each Pet Card.
    borderColor: '1px solid gray',

    // Whether to make an alert which shows the Completion Page's text.
    // Enabling this allows for checking Super Bonuses!!! more easily.
    alertCompletionText: false,

    // Aesthetic option allowing stats to be displayed in a single
    oneStatColumn: false,

    // Censor your pet's names for screenshots with the given string.
    // Mostly used for dev examples.
    // Comment this line out to disable censoring.
    // censorPetName: (name) => (name.slice(0, 4) + '*******'),
};

const censorFn = CONFIG.censorPetName || ((name) => name);

// user has premium toolbar
let premium = $("#sswmenu .imgmenu").length;

async function showCostsOnSdb() {
    const costString = await GM.getValue('trainingPayment', '{}');
    const costs = JSON.parse(costString);

    if (!costs) {
        return;
    }

    for (const cost in costs) {
        const itemNameB = [...document.getElementsByTagName('b')].filter(b => b.innerText.includes(cost))[0];
        if (!itemNameB) {
            console.warn('None of item included', cost);
            continue;
        }
        const neededEl = document.createElement('b');
        neededEl.innerText = `Need x${costs[cost]}`;
        const removeCountTd = itemNameB.parentElement.parentElement.children[5];
        removeCountTd.appendChild(document.createElement('br'));
        removeCountTd.appendChild(neededEl);
    }
}

// Fill out needed Codestones and Dubloons.
async function fillSdbForm() {
    const costString = await GM.getValue('trainingPayment', '{}');
    const costs = JSON.parse(costString);

    const removeInputs = [...document.getElementsByClassName('content')[0].getElementsByClassName('remove_safety_deposit')];
    for (const removeInput of removeInputs) {
        const nameTd = removeInput.parentElement.previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling;
        const name = nameTd.innerText.split('\n')[0].trim();
        if (name in costs) {
            removeInput.value = costs[name];
            removeInput.setAttribute('data-remove_val', 'y');
        }
    }
}

const Status = {
    NOT_TRAINING: 'Not Training',
    NEEDS_PAYMENT: 'Needs Payment',
    IN_PROGRESS: 'Training',
    COMPLETE: 'Complete',
};

const CourseType = ['Level', 'Strength', 'Defence', 'Agility', 'Endurance'];
function signUpHref(name, course) {
    const path = `process_${window.location.pathname.split('/').pop()}`;
    const params = `?type=start&course_type=${course}&pet_name=${name}`;
    return path + params;
}

function createSwLink(item) {
    if (premium){
        const a = document.createElement('a');
        a.innerText = 'SW';
        a.href = 'https://www.neopets.com/shops/wizard.phtml?string=' + item.replace(/\s/g, '+');
        return a;
    }
    else {
        return sswlink(item);
    }
}

function sswlink(item) {
    // the only different one because it doesn't use a URL
    return `<img item='${item}' class='ssw-helper searchimg' src='${linkmap.ssw.img}'>`;
}

// Cribbed from Dice's Search Helper
function sswopen(item) {
    $(".premium-widget__2024").hide(); // hide all open widgets
    toggleWidget__2020("ssw");

    $("#ssw-criteria").val("exact");
    $("#searchstr").val(item);
    $("#ssw-button-new-search")[0].click();
}

function createSdbLink(item) {
    const a = document.createElement('a');
    a.href = 'https://www.neopets.com/safetydeposit.phtml?category=0&obj_name=' + item.replace(/\s/g, '+');
    a.innerText = 'SDB';
    return a;
}

async function startCourse(petName, course) {
    const url = `process_${location.pathname.split('/').pop()}?type=start&course_type=${course}&pet_name=${petName}`;
    console.log('Starting Course', petName, course);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        return response.text();
    } catch (error) {
        log('ERROR: Something went awry starting course');
        console.error(error.message);
        return error;
    }
}

// Options are 'pay', 'cancel', and 'complete'
async function processCourse(petName, option) {
    const url = `process_${location.pathname.split('/').pop()}?type=${option}&pet_name=${petName}`;

    try {
        const response = await fetch(url);

        if (option == 'complete') {
            if (CONFIG.alertCompletionText) {
                let txt = await response.text();
                let html = document.createElement('html');
                html.innerHTML = txt;
                alert(html.innerText);
            }
            // Simply reload the page since Completion is a completely different page...
            const res = await fetch(location.href);
            return res.text();
        }

        return response.text();
    } catch (error) {
        log('ERROR: Something went awry processing course');
        console.error(error.message);
        return error;
    }
}

const costTable = document.createElement('table');
costTable.innerHTML = `<tbody>
  <tr>
    <td style="width:60%">
    Change Log<br>
      <textarea rows='10' cols='60' disable=true></textarea>
    </td>
    <td style='width:28%' class='cost-table'>
    </td>
    <td style='width:12%'>
      <button id="link-sdb"></button>
    </td>
  </tr>
</tbody>`;
costTable.style.width = '750px';
const logArea = costTable.getElementsByTagName('textarea')[0];

function log(txt) {
    const newTxt = txt + '\r\n';
    logArea.value += newTxt;

    // Keep selection at the end so that we always display the new things.
    logArea.focus();
    logArea.selectionStart += newTxt.length;
    logArea.selectionEnd += newTxt.length;
}

function logDelta(pet, attr, from, to, notes='') {
    pet = censorFn(pet);
    log(`  ${pet} - ${attr}: ${from} -> ${to} ` + notes);
}

const statNames = ['Level', 'Strength', 'Defence', 'Agility', 'Endurance'];

class Pet {

    constructor(updateFn) {
        // Information gleamed from nameTd
        this.name = '';
        this.trainingStat = '';
        this.nameCard;
        this.initNameCard();

        // Information from statTd
        this.imgSrc = '';
        this.stats = [-1, -1, -1, -1, '-1'];
        this.trainHref = '';
        this.statCard;
        this.initStatCard();

        // Information from statusTd
        this.status = -1;
        this.costs = [];
        this.timeRemaining;
        this.timeRemainingDiscount;
        this.completeCourseBtn;
        this.payTbl;
        this.statusCard;
        this.initStatusCard();

        this.updateFn = updateFn;
    }

    displayName() {
        console.log(CONFIG.censorPetName || this.name);
        return censorFn(this.name);
    }

    setLoading() {
        const img = this.statCard.getElementsByTagName('img')[0];
        img.style.opacity = '75%';
    }

    update(nameTd, statTd, statusTd) {
        const img = this.statCard.getElementsByTagName('img')[0];
        img.style.opacity = '';
        this.updateFromNameTd(nameTd);
        this.updateFromStatusTd(statusTd);
        this.updateFromStatTd(statTd);
    }

    initNameCard() {
        this.nameCard = document.createElement('td');
        this.nameCard.innerHTML = `<b class='pet-name'></b>`;
        this.nameCard.style.border = CONFIG.borderColor;
    }

    updateFromNameTd(nameTd) {
        // Information gleamed from nameTd
        const newName = nameTd.innerText.match(/^\w+/)[0];
        const newTrainingStat = (nameTd.innerText.match(/studying (\w+)/) || [])[1];
        this.updateNameCard(newName, newTrainingStat);
    }

    updateNameCard(newName, newTrainingStat) {
        if (this.name !== newName) {
            this.name = newName;
            const petNameEl = this.nameCard.getElementsByClassName('pet-name')[0];
            petNameEl.innerText = censorFn(newName);
        }

        if (this.trainingStat != newTrainingStat) {
            if (!this.trainingStat) {
                this.nameCard.appendChild(document.createElement('div'))
            }
            const studyingDiv = this.nameCard.getElementsByTagName('div')[0];
            if (newTrainingStat) {
                studyingDiv.innerText = `training ${newTrainingStat}`;
            } else {
                // No new training stat, remove it.
                this.nameCard.removeChild(studyingDiv);
            }

            this.trainingStat = newTrainingStat;
        }
    }

    initStatCard() {
        const statTable = document.createElement('table');
        statTable.class = 'stat-table'
        statTable.innerHTML = `<tbody>
  <tr>
    <td><a value='Level'>Lv:</a></td>
    <td><b class='pet-stat-0'></b></td>
${CONFIG.oneStatColumn ? '</tr><tr>' : ''}
    <td><a value='Strength'>Str:</a></td>
    <td><b class='pet-stat-1'></b></td>
  </tr>
  <tr>
    <td><a value='Defence'>Def:</a></td>
    <td><b class='pet-stat-2'>$</b></td>
${CONFIG.oneStatColumn ? '</tr><tr>' : ''}
    <td><a value='Agility'>Mov:</a></td>
    <td><b class='pet-stat-3'>$</b></td>
  </tr>
  <tr>
    <td><a value='Endurance'>HP:</a></td>
    <td colspan='3'><b class='pet-stat-4'>$</b></td>
  </tr>
</tbody>`;
        statTable.style.width = '100%';
        const tds = [...statTable.getElementsByTagName('td')];
        for (let i = 0; i < tds.length; i += 2) {
            tds[i].style.padding = '0 1px';
            tds[i+1].style.padding = '0 1px';
            tds[i+1].style.textAlign = 'right';
        }

        this.statCard = document.createElement('td');
        this.statCard.appendChild(document.createElement('img'));
        this.statCard.appendChild(statTable);
        this.statCard.style.borderLeft = CONFIG.borderColor;
        this.statCard.style.borderRight = CONFIG.borderColor;
    }

    updateFromStatTd(statTd) {
        const newImg = statTd.getElementsByTagName('img')[0];
        const stats = [...statTd.getElementsByTagName('b')].map(b => b.innerText);
        const newLvl = Number(stats[0]);
        const newStr = Number(stats[1]);
        const newDef = Number(stats[2]);
        const newMov = Number(stats[3]);
        const newHp = Number(stats[4].split('/')[1]);
        const newCurHp = Number(stats[4].split('/')[0]);
        const newHpString = `${newCurHp} / ${newHp}`;
        const under2xLvl = [newStr, newDef, newMov, newHp].every((stat) => stat <= 2 * newLvl);

        let newCanTrain = [false, false, false, false, false];
        if (this.status == Status.NOT_TRAINING) {
            if (location.pathname.includes('pirates') && newLvl <= 40) {
                newCanTrain = [
                    true,
                    under2xLvl,
                    under2xLvl,
                    under2xLvl,
                    under2xLvl,
                ];
            } else if (location.pathname.includes('fight') && newLvl >= 250 || location.pathname == '/island/training.phtml') {
                newCanTrain = [
                    true,
                    under2xLvl,
                    under2xLvl,
                    under2xLvl,
                    newHp <= 3 * newLvl,
                ];
            }
        }

        this.updateStatCard(newImg, [newLvl, newStr, newDef, newMov, newHpString], newCanTrain);
    }

    updateStatCard(newImg, newStats, newCanTrain) {
        if (this.imgSrc != newImg.src) {
            const oldImg = this.statCard.getElementsByTagName('img')[0];
            this.statCard.insertBefore(newImg, oldImg);
            this.statCard.removeChild(oldImg);
        }

        const anchors = [...this.statCard.getElementsByTagName('a')];
        const statBs = [...this.statCard.getElementsByTagName('b')];
        this.status == Status.NOT_TRAINING;
        for (let i = 0; i < 5; i++) {
            const newStat = newStats[i];
            if (this.stats[i] !== newStat) {
                if (this.stats[i] != -1) {
                    logDelta(this.name, statNames[i], this.stats[i], newStat, newStat - this.stats[i] > 1 ? 'SUPER BONUS!' : '');
                }
                this.stats[i] = newStat;
                statBs[i].innerText = String(newStat);
            }
            const a = anchors[i];
            const canTrain = newCanTrain[i];
            // Add the + conditionally
            a.style.cursor = canTrain ? 'pointer' : 'default';
            if (canTrain && !a.innerText.includes('+')) {
                a.innerText = '+' + a.innerText;
                a.onclick = () => {
                    const course = a.getAttribute('value');
                    log(`Signing ${this.displayName()} up for ${course}`);
                    this.setLoading();
                    startCourse(this.name, course)
                        .then((txt) => this.updateFn(txt));
                }
                a.title = `Train ${CONFIG.censorPetName || this.name}'s ${a.getAttribute('value')}`;
            } else if(!canTrain && a.innerText.includes('+')) {
                // Remove the +
                a.innerText = a.innerText.match(/\w+:/)[0];
                a.onclick = () => { alert('Cannot Train'); }
                a.title = '';
            }
        }
    }

    initStatusCard() {
        this.statusCard = document.createElement('td');
        this.statusCard.style.textAlign = 'center';
        this.statusCard.style.border = CONFIG.borderColor;
    }

    updateFromStatusTd(statusTd) {
        let newStatus = Status.NOT_TRAINING;
        if (statusTd.innerText.includes('Course Finished!')) {
            newStatus = Status.COMPLETE;
            this.completeCourseBtn = document.createElement('button');
            this.completeCourseBtn.innerText = 'Complete Course!';
            this.completeCourseBtn.onclick = () => {
                log(`Completing course for ${this.displayName()}`);
                this.setLoading();
                processCourse(this.name, 'complete').then(txt => this.updateFn(txt) );
            };
        } else if (statusTd.innerText.includes('Dubloon') || statusTd.innerText.includes('Codestone')) {
            this.costs = [];
            newStatus = Status.NEEDS_PAYMENT;
            for (const paymentB of statusTd.getElementsByTagName('b')) {
                this.costs.push(paymentB.innerText);
            }

            this.payTbl = document.createElement('table');
            this.payTbl.innerHTML = `<tbody>
<tr>
  <td>
    <button value='${this.name}-pay'>Pay</button>
  </td>
  <td>
    <button value='${this.name}-cancel'>Cancel</button>
  </td>
</tr></tbody>`;

            for (const btn of this.payTbl.getElementsByTagName('button')) {
                btn.onclick = () => {
                    log(`${this.displayName()} - ${btn.innerText}ing Course...`);
                    this.setLoading();
                    const [pet, opt] = btn.value.split('-');
                    processCourse(pet, opt).then(this.updateFn);
                }
            }
        } else if (statusTd.innerText.includes('Time till course finishes')) {
            const [timeRemainingMatch, maybeDiscountMatch] = [...statusTd.innerText.matchAll(/(\d+)[^\d]+(\d+)[^\d]+(\d+)/g)];
            const [m, hr, min, sec] = timeRemainingMatch;
            this.timeRemaining = hr + ':' + min.padStart(2, '0') + ':' + sec.padStart(2, '0');
            if (maybeDiscountMatch) {
                const [m, hr, min, sec] = maybeDiscountMatch;
                this.timeRemainingDiscount = hr + ':' + min.padStart(2, '0') + ':' + sec.padStart(2, '0');
            }
            newStatus = Status.IN_PROGRESS;
        }

        this.updateStatusCard(newStatus);
    }

    updateStatusCard(newStatus) {
        while (this.statusCard.firstChild) {
            this.statusCard.removeChild(this.statusCard.firstChild);
        }

        if (this.status != newStatus && this.status != -1) {
            logDelta(this.name, 'Status', this.status, newStatus);
        }
        this.status = newStatus;

        switch (this.status) {
            case Status.NOT_TRAINING:
                this.statusCard.innerText = 'Not Training';
                this.statusCard.style.backgroundColor = CONFIG.statusColor.notTraining;
                break;
            case Status.NEEDS_PAYMENT:
                this.statusCard.style.backgroundColor = CONFIG.statusColor.needsPayment;
                for (const payment of this.costs) {
                    const paymentShort = payment.split(' ')[0];
                    const paymentB = document.createElement('b');
                    paymentB.innerText = paymentShort;
                    this.statusCard.appendChild(paymentB);
                    if (CONFIG.shopWizardBtn) {
                        this.statusCard.appendChild(createSwLink(payment));
                    }
                    if (CONFIG.sdbBtn) {
                        this.statusCard.appendChild(createSdbLink(payment));
                    }
                    this.statusCard.appendChild(document.createElement('br'));
                }
                this.statusCard.appendChild(this.payTbl);
                break;
            case Status.IN_PROGRESS:
                this.statusCard.style.backgroundColor = CONFIG.statusColor.inProgress;

                // Affected by Fortune Cookie.
                if (this.timeRemainingDiscount) {
                    const timeRemainingB = document.createElement('b');
                    timeRemainingB.innerText = this.timeRemaining;
                    timeRemainingB.style.textDecoration = 'line-through';
                    this.statusCard.appendChild(timeRemainingB);
                    this.statusCard.appendChild(document.createElement('br'));

                    const discountB = document.createElement('b');
                    discountB.innerText = this.timeRemainingDiscount;
                    this.statusCard.appendChild(discountB);
                } else {
                    const timeRemainingB = document.createElement('b');
                    timeRemainingB.innerText = this.timeRemaining;
                    this.statusCard.appendChild(timeRemainingB);
                }
                break;
            case Status.COMPLETE:
                this.statusCard.style.backgroundColor = CONFIG.statusColor.complete;
                this.statusCard.appendChild(this.completeCourseBtn);
                break;
        }
    }
}

/**
 * Reactive Table generated from the original Training Table.
 *
 */
class TrainingTable {
    constructor(baseTable) {
        this.pets = [];

        const rows = [...baseTable.children[0].children];
        let tds = [];
        for (const row of rows) {
            tds = tds.concat([...row.children]);
        }

        for (let i = 0; i < tds.length / 3; i++) {
            this.pets.push(new Pet((txt) => this.updateFn(txt)));
        }

        this.updateFromTable(baseTable);
    }

    updateFromTable(table) {
        const rows = [...table.children[0].children];
        let tds = [];
        for (const row of rows) {
            tds = tds.concat([...row.children]);
        }

        for (let i = 0; i < tds.length; i += 3) {
            const nameTd = tds[i];
            const statTd = tds[i + 1];
            const statusTd = tds[i + 2];
            this.pets[i / 3].update(nameTd, statTd, statusTd);
        }
    }

    // For updating from a GET request probably instantiated by
    // Complete Course! Pay, Cancel, Start Course
    updateFn(txt) {
        const html = document.createElement('html');
        html.innerHTML = txt;

        try {
            let mainTable = [...html.getElementsByTagName('table')].filter(tbl => tbl.width == '500')[0];
            this.updateFromTable(mainTable);
            this.updateCostTable();
        } catch (error) {
            log('ERROR: Something went wrong with parsing the updated HTML!');
            console.error(error);
        }
    }

    getAllCosts() {
        const result = {};
        for (const pet of this.pets.filter((p) => p.status == Status.NEEDS_PAYMENT)) {
            for (const payment of pet.costs) {
                if (payment in result) {
                    result[payment] += 1;
                } else {
                    result[payment] = 1;
                }
            }
        }
        return result;
    }

    async storeCosts() {
        const costString = JSON.stringify(this.getAllCosts());
        await GM.setValue('trainingPayment', costString);
    }

    render() {
        const rendered = document.createElement('table');

        const rowCount = Math.ceil(this.pets.length / CONFIG.columns) * 3;
        rendered.appendChild(document.createElement('tbody'));
        const rows = [];
        for (let i = 0; i < rowCount; i++) {
            const row = document.createElement('tr');
            rows.push(row);
            rendered.firstChild.appendChild(row);
        }

        for (let i = 0; i < this.pets.length; i++) {
            const pet = this.pets[i];
            const baseRowIdx = Math.floor(i / CONFIG.columns) * 3;
            rows[baseRowIdx].appendChild(pet.nameCard);
            rows[baseRowIdx + 1].appendChild(pet.statCard);
            rows[baseRowIdx + 2].appendChild(pet.statusCard);
        }

        return rendered;
    }

    renderCostTable() {
        const costs = this.getAllCosts();
        const ul = document.createElement('div');
        let paymentType = 2;
        let category = 0;
        for (const payment in costs) {
            const cost = costs[payment];
            const li = document.createElement('p');
            li.innerText = `${payment} x${cost}`;
            ul.appendChild(li);
            if (payment.includes('Codestone')) {
                paymentType = 2
            } else {
                paymentType = 3;
            }
        }

        // Display Codestone/Dubloon cost
        const listTd = costTable.getElementsByTagName('td')[1];
        listTd.appendChild(ul);

        const sdbBtn = costTable.getElementsByTagName('button')[0];
        sdbBtn.innerText = 'Open SDB';
        sdbBtn.onclick = () => {
            this.storeCosts().then(() => {
                window.open('/safetydeposit.phtml?obj_name=&category=' + paymentType, '_blank');
            });
        };

        return costTable;
    }

    updateCostTable() {
        const costTd = costTable.getElementsByTagName('td')[1];
        while (costTd.firstChild) {
            costTd.removeChild(costTd.firstChild);
        }
        const costs = this.getAllCosts();
        const ul = document.createElement('ul');
        let paymentType = '';
        let category = 2;
        for (const payment in costs) {
            const cost = costs[payment];
            const li = document.createElement('li');
            li.innerText = `${payment} x${cost}`;
            ul.appendChild(li);
            if (payment.includes('Codestone')) {
                paymentType = 2
            } else {
                paymentType = 3;
            }
        }

        costTd.appendChild(ul);

        const sdbBtn = costTable.getElementsByTagName('button')[0];
        sdbBtn.onclick = () => {
            this.storeCosts();
            window.open('/safetydeposit.phtml?obj_name=&category=' + paymentType, '_blank');
        };
    }
}

(function() {
    'use strict';

    if (location.pathname == "/safetydeposit.phtml") {
        Promise.every([fillSdbForm(), showCostsOnSdb()]).then(() => {
            GM.deleteValue('trainingPayment');
        });
        return;
    }

    const content = document.getElementsByClassName('content')[0];
    content.removeChild(content.children[0]);

    const tbl = [...content.getElementsByTagName('table')].filter(tbl => tbl.width == '500')[0];

    const trainingTable = new TrainingTable(tbl);

    const final = trainingTable.render();
    tbl.parentElement.insertBefore(final, tbl);
    tbl.parentElement.insertBefore(trainingTable.renderCostTable(), final);

    tbl.parentElement.removeChild(tbl);

})();