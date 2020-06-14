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
    document.getElementById('usageCount').innerText = abbrevateFilesize(counter.data.usage.total)
    document.getElementById('userCount').innerText = thousandSeperator(counter.data.usercount)
})

function abbrevateFilesize(size) {
    let abbrevated
    if (size > 1125899906842623) {
        // Petabytes
        abbrevated = thousandSeperator(Math.round(size / 1125899906842624)) + ' PB'
    } else if (size > 1099511627775) {
        // Terabytes
        abbrevated = thousandSeperator(Math.round(size / 1099511627776)) + ' TB'
    } else if (size > 1073741823) {
        // Gigabytes
        abbrevated = thousandSeperator(Math.round(size / 1073741824)) + ' GB'
    } else if (size > 1048575) {
        // Megabytes
        abbrevated = thousandSeperator(Math.round(size / 1048576)) + ' MB'
    } else {
        // Less than 1 MB
        abbrevated = thousandSeperator(Math.round(size / 1024)) + ' KB'
    }

    return abbrevated
}

function thousandSeperator(num) {
    let num_parts = num.toString().split(".");
    num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return num_parts.join(".");
}