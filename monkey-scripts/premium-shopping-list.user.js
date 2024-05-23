// ==UserScript==
// @name         Premium Shopping List <Rayenz>
// @description  Keep track of shopping list **Tested in Chrome only!**
// @version      2024-05-04
// @author       rayenz-akusiom
// @match        *://*.neopets.com/premium/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

/**
 * Ideas / things to fix:
 * - Category adding doesn't work right
 * - Replace shop wiz checkbox with checking the item name
 * - Put the item names in the items so that I can jquery add them
 * - Sorting / Rearranging?
 * - Deleting
 * - Editing?
 * - Category dropdown?
 * - target commas
 */

/**
* Monkey Storage
**/
const SHOPPING_STORAGE = "shoppingStorage";
let shoppingStorage = new Map();
if (GM_getValue(SHOPPING_STORAGE)) {
    shoppingStorage = new Map(JSON.parse(GM_getValue(SHOPPING_STORAGE)));
}

// "Main"
setUpClasses();
initializeShoppingList();
importShoppingList();
setUpCollapsibles();

function initializeShoppingList() {
    const sswBar = document.getElementsByClassName("pp-ssw__2020")[0];
    const shoppingListContainer = document.createElement("div");
    shoppingListContainer.classList.add("pp-carousel-container");
    shoppingListContainer.id = "rayenz-sl";
    shoppingListContainer.innerHTML = blankShoppingList();
    sswBar.after(shoppingListContainer);

    // Wire up Submit button
    const submitButton = document.getElementById("rayenz-sl-adder-submit")
    submitButton.addEventListener("click", function () { addItem() });
}

function importShoppingList() {
    shoppingStorage.forEach(insertCategory)
}

function insertCategory(items, category) {
    let categoryDiv = document.getElementById(`rayenz-sl-category-${category}`);
    if (!categoryDiv) {
        const innerContainer = document.getElementById("rayenz-sl-inner-ctn");

        const categoryButton = document.createElement("button");
        categoryButton.id = `rayenz-sl-category-btn-${category}`;
        categoryButton.classList.add(`rayenz-sl-collapsible`);
        categoryButton.innerText = category;
        innerContainer.appendChild(categoryButton);

        categoryDiv = document.createElement("div")
        categoryDiv.id = `rayenz-sl-category-${category}`;
        categoryDiv.classList.add("rayenz-sl-category");
        innerContainer.appendChild(categoryDiv);
    }

    for (let i = 0; i < items.length; i++) {
        insertItem(items[i]);
    }
}

function insertItem(item) {
    const categoryDiv = document.getElementById(`rayenz-sl-category-${item.category}`);
    const itemElements = formatItem(item);
    categoryDiv.appendChild(itemElements);

    if (!sswlimited(item.name)) {
        const itemIcon = document.getElementById(`rayenz-sl-item-${item.id}`);
        itemIcon.addEventListener("click", function () { openSearch(item.name, item.ssw) });
    }
    else {
        $(`#rayenz-sl-item-${item.id}`).wrap(`<a target="_blank" href='https://www.neopets.com/shops/wizard.phtml?string=${item.name}'></a>`);
    }
}

function addItem() {
    const name = document.getElementById("iname");
    const url = document.getElementById("imgurl");
    const category = document.getElementById("icategory");
    const target = document.getElementById("itarget");

    let addedItem = {
        name: name.value,
        id: kebabify(name.value),
        url: url.value,
        category: category.value,
        target: target.value,
    };

    // Reset "form"
    name.value = "";
    url.value = "";
    target.value = "";

    // Add to shopping storage
    const listCategory = shoppingStorage.get(addedItem.category);
    if (listCategory) {
        listCategory.push(addedItem);
    }
    else {
        shoppingStorage.set(addedItem.category, [addedItem]);
    }

    sortShoppingList();
    saveShoppingList();

    insertItem(addedItem);
}

function formatItem(item) {
    const gridItem = document.createElement("div");
    gridItem.classList.add("rayenz-sl-grid-item");
    gridItem.innerHTML = `
        <img id="rayenz-sl-item-${item.id}" class="rayenz-sl-item" src="${item.url}">
        <p class="rayenz-sl-item-name">${item.name}</p>
        <p class="rayenz-sl-item-name">(${Number(item.target).toLocaleString()})</p>
    `;

    return gridItem;
}

function sortShoppingList(){
    for (let [category, list] of shoppingStorage){
        let sortedCategory = Array.from(list);

        // Sort by name first
        sortedCategory = sortedCategory.sort((firstItem, secondItem) => {return ('' + firstItem.name).localeCompare(secondItem.name)});

        // Put SSW-able items first
        let sswItems = [];
        let wizItems = [];
        for(let item of sortedCategory){
            if(sswlimited(item.name)) {
                wizItems.push(item);
            }
            else {
                sswItems.push(item);
            }
        }

        sortedCategory = sswItems.concat(wizItems);
        shoppingStorage.set(category, sortedCategory);
    }
}

function saveShoppingList() {
    storeMonkeyMap(SHOPPING_STORAGE, shoppingStorage);
}

function storeMonkeyMap(key, mapToStore) {
    GM_setValue(key, JSON.stringify(Array.from(mapToStore.entries())));
}

function kebabify(rawString) {
    const tokens = rawString.toLowerCase().split(" ");
    return tokens.join("-");
}

// Cribbed from Dice's Search Helper
function sswlimited(itemName) {
    return (/Nerkmid($|.X+$)/.test(itemName) || itemName.endsWith("Paint Brush") || itemName.endsWith("Transmogrification Potion") || itemName.endsWith("Laboratory Map"));
}

// Cribbed from Dice's Search Helper
function openSearch(item) {
    // open this in such a way that if the "__2020" was changed/removed without warning, this will still work
    // TODO: hardcode the class name better once out of beta
    $("[class^='ssw-header']").last().parent().show();

    // if results are currently up, close them
    $("#ssw-button-new-search").click();

    $("#ssw-criteria").val("exact");
    $("#searchstr").val(item);
}

function blankShoppingList() {
    return `
        <div class="premium-pets-title">
            <h2>Shopping List</h2>
        </div>

        <div id="rayenz-sl-ctn" class="rayenz-shopping-list">
            <div id="rayenz-sl-list">
                <div id="rayenz-sl-inner-ctn" class="rayenz-sl-ctn">
                </div>
            </div>
            <button type="button" id="rayenz-sl-control-collapse" class="rayenz-sl-collapsible">Add Items</button>
            <div class="rayenz-sl-controls">
                <label for="iname">Item Name</label>
                <input type="text" id="iname" name="iname"><br><br>
                <label for="imgurl">Image URL:</label>
                <input type="text" id="imgurl" name="imgurl"><br><br>
                <label for="icategory">Category</label>
                <input type="text" id="icategory" name="icategory"><br><br>
                <label for="itarget">Target Buying point</label>
                <input type="text" id="itarget" name="itarget"><br><br>
                <button type="button" id="rayenz-sl-adder-submit">Add</button>
            </div>
        </div>
    `
}

function setUpCollapsibles() {
    //Collapsible event listener
    var coll = document.getElementsByClassName("rayenz-sl-collapsible");

    for (var i = 0; i < coll.length; i++) {
        if (coll[i].id !== "rayenz-sl-control-collapse"){
            coll[i].addEventListener("click", function () { toggleVisibility(this, "grid")});
        }
        else {
            coll[i].addEventListener("click", function () { toggleVisibility(this, "block")});
        }
    }
}

function toggleVisibility(element, type) {
    element.classList.toggle("rayenz-sl-active");
    var content = element.nextElementSibling;
    if (content.style.display && content.style.display !== "none") {
        content.style.display = "none";
    } else {
        content.style.display = type;
    }
}

function setUpClasses() {
    let headElement = document.getElementsByTagName("head")[0];
    let styleTag = document.createElement("style");
    styleTag.innerHTML = `
    .rayenz-shopping-list {
        display: grid;
        position: relative;
        width: calc(100% - 40px);
        margin: 20px auto;
        border-image-slice: 20 20 20 20 fill;
        border-image-width: 20px 20px 20px 20px;
        border-image-outset: 20px 20px 20px 20px;
        border-image-repeat: repeat repeat;
        border-image-source: url(https://images.neopets.com/premium/portal/images/pets-backing.svg);
        border-style: solid;
        box-sizing: border-box;
        margin-left 86px;
        margin-right 86px;
        max-width: 850px;
    }

    #rayenz-sl button,
    #rayenz-sl label{
        font-family: "Cafeteria", 'Arial Bold', sans-serif;
        letter-spacing: 0.5px;
        font-size: 14pt;
        color: #000;
    }
    .rayenz-sl-ssw-icon {
        width: 30px;
        height: 30px;
        float: left;
        margin-right: 10px;
        background-image: url(https://images.neopets.com/premium/shopwizard/ssw-icon.svg);
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
    }

    /** Shopping List Grid */
    .rayenz-sl-category {
        display: grid;
        grid-template-columns: 120px 120px 120px 120px 120px 120px;
        grid-template-rows: 175px;
        column-gap: 10px;
        row-gap: 10px;
        width: 862px;
        background-color: white;
        overflow: hidden;
        margin: 0px auto 0px;
        padding: 10px 45px 10px 45px;
        transition: max-height 0.2s ease-out;
        display: none;
    }
    .rayenz-sl-grid-item {
        display: block;
        width: 120px;
    }
    .rayenz-sl-item {
        width: 80px;
        height: 80px;
        margin-left: 20px;
        margin-right: 20px;
    }
    .rayenz-sl-item-name {
        font-family: MuseoSansRounded500, Arial, sans-serif;
        font-size: 14.667px;
        margin-block-end 5px;
        margin-block-start: 5px;
        margin-bottom: 5px;
        margin-inline-end: 6px;
        margin-inline-start: 6px;
        margin-left: 6px;
        margin-right: 6px;
        margin-top: 5px;
        text-align: center;
        width: 108px;
    }

    /* Controls */
    .rayenz-sl-controls {
        background-color: white;
        overflow: hidden;
        transition: max-height 0.2s ease-out;
        max-width: 850px;
        display: none;
    }

    /* Collapsible Styling */
    .rayenz-sl-collapsible {
        cursor: pointer;
        padding: 18px;
        width: 100%;
        border: none;
        text-align: left;
        outline: none;
        margin: 0;
    }

    .rayenz-sl-active,
    .rayenz-sl-collapsible:hover {
        background-color: #555;
    }

    .rayenz-sl-collapsible:after {
        content: 'v';
        float: right;
        margin-left: 5px;
    }
    .rayenz-sl-active:after {
        content: ">";
    }
    `
    headElement.appendChild(styleTag);
}