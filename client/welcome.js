window.addEventListener('scroll',() => {
    if (window.scrollY > 200) {
        document.getElementById('homepageheader').style.visibility = 'visible'
        document.getElementById('homepageheader').style.opacity = 1
    } else {
        document.getElementById('homepageheader').style.visibility = 'hidden'
        document.getElementById('homepageheader').style.opacity = 0
    }
})

// Get update logs then display them on homepage
axios.get('/updatelogs').then((response) => {
    let updates = response.data
    let updatesHTML = document.getElementById('updatesContainer').innerHTML

    for (let i = updates.length - 1; i >= 0; i--) {
        updatesHTML += '<div class="updatelogitem"><div class="updatelog">Version ' + updates[i].version + '<br>Released ' + updates[i].created + '<br><br><a href="' + updates[i].link + '" target="_blank">' + updates[i].description + '</a><div class="updatepayout">Payout: ' + updates[i].payout + '</div></div></div>'
    }

    document.getElementById('updatesContainer').innerHTML = updatesHTML
}).catch((error) => {
    console.log(error)
})

// Load general uploader stats
axios.get('/stats').then((counter) => {
    document.getElementById('uploadCount').innerText = thousandSeperator(counter.data.count)
    document.getElementById('usageCount').innerText = abbrevateFilesize(counter.data.usage)
    document.getElementById('userCount').innerText = thousandSeperator(counter.data.usercount)
})