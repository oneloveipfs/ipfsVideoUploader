function loginBtnClicked() {
    // Show popup window of login options
    document.getElementById('loginPopup').style.display = "block"
}

window.onclick = (event) => {
    dismissPopup(event,'loginPopup')
}

window.ontouchstart = (event) => {
    dismissPopup(event,'loginPopup')
}

function dismissPopup(event,popupelement) {
    let popup = document.getElementById(popupelement)
    if (event.target == popup) {
        popup.style.display = "none"
    }
}

function keychainLogin() {

}