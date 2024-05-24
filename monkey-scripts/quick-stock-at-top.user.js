// ==UserScript==
// @name         Quick Stock At Top <Rayenz>
// @namespace    http://tampermonkey.net/
// @version      2024-05-10
// @description  Add quick stock buttons at the top of the page.
// @author       rayenz-akusiom
// @match        https://www.neopets.com/quickstock.phtml
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        none
// ==/UserScript==

if (document.readyState !== 'loading') {
    addCheckAllRow();
  }
  else {
    document.addEventListener('DOMContentLoaded', addCheckAllRow());
}

function addCheckAllRow(){
    $('form[name="quickstock"] tr:first').after(checkAllRowTop());
}

function checkAllRowTop(){
 return `
 <tr><td colspan="8" align="center" bgcolor="#eeeebb">
<input type="submit" value="Submit" onclick=" if (!check_discard()) { return false; } ">
&nbsp;&nbsp;
<input type="reset" value="Clear Form">
</td></tr>
 <tr bgcolor="#eeeebb">
<td><b>Check All</b></td>
<td align="center" width="50"><input type="radio" name="checkall" onclick="check_all(1); this.checked = true;"></td>
<td align="center" width="50"><input type="radio" name="checkall" onclick="check_all(2); this.checked = true;"></td>
<td align="center" width="50"><input type="radio" name="checkall" onclick="check_all(3); this.checked = true;"></td>
<td align="center" width="50"><input type="radio" name="checkall" onclick="check_all(4); this.checked = true;"></td>
<td align="center" width="50"><input type="radio" name="checkall" onclick="check_all(5); this.checked = true;"></td>
<td align="center" width="50"><input type="radio" name="checkall" onclick="check_all(6); this.checked = true;"></td>
<td align="center" width="50"><input type="radio" name="checkall" onclick="check_all(7); this.checked = true;"></td>
</tr>`
}