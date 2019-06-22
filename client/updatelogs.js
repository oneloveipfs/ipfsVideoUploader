// Get update logs then display them on homepage
axios.get('/updatelogs').then((response) => {
    let updates = response.data
    let updatesHTML = document.getElementById('updates').innerHTML

    for (let i = updates.length - 1; i >= 0; i--) {
        updatesHTML += '<div class="updatelog">Version ' + updates[i].version + '<br>Released ' + updates[i].created + '<br><br><a href="' + updates[i].steemitLink + '">' + updates[i].description + '</a><br><br>Payout: ' + updates[i].payout + '</div>'
    }

    document.getElementById('updates').innerHTML = updatesHTML
}).catch((error) => {
    console.log(error)
})

// <div class="updatelog">Version 0.8.3<br>Released 17 January 2019<br><br><a href="https://steemit.com/onelovedtube/@techcoderx/onelovedtube-ipfs-uploader-0-8-3-mobile-optimizations-multi-resolution-upload-support-and-more">Mobile optimizations, multi-resolution upload support and more!</a><br><br>Payout: $51.02</div>

// Load general uploader stats
axios.get('/totalUploadCount').then((counter) => {
    axios.get('/totalUsage').then((allUse) => {
        document.getElementById('homeStats').innerText = counter.data.count + ' unique DTube videos uploaded to date, with file sizes totaling ' + abbrevateFilesize(allUse.data.total) + '.'
    })
})

function abbrevateFilesize(size) {
    let abbrevated
    if (size > 1125899906842623) {
        // Petabytes
        abbrevated = Math.round(size / 1125899906842624) + ' PB'
        return size / 1125899906842624
    } else if (size > 1099511627775) {
        // Terabytes
        abbrevated = Math.round(size / 1099511627776) + ' TB'
    } else if (size > 1073741823) {
        // Gigabytes
        abbrevated = Math.round(size / 1073741824) + ' GB'
    } else if (size > 1048575) {
        // Megabytes
        abbrevated = Math.round(size / 1048576) + ' MB'
    } else {
        // Less than 1 MB
        abbrevated = Math.round(size / 1024) + ' KB'
    }

    return abbrevated
}