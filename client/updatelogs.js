// Get update logs then display them on homepage
axios.get('/updatelogs').then((response) => {
    let updates = response.data
    let updatesHTML = document.getElementById('updates').innerHTML

    for (var i = updates.length - 1; i >= 0; i--) {
        updatesHTML += '<div class="updatelog">Version ' + updates[i].version + '<br>Released ' + updates[i].created + '<br><br><a href="' + updates[i].steemitLink + '">' + updates[i].description + '</a><br><br>Payout: ' + updates[i].payout + '</div>'
    }

    document.getElementById('updates').innerHTML = updatesHTML
}).catch((error) => {
    console.log(error)
})

// <div class="updatelog">Version 0.8.3<br>Released 17 January 2019<br><br><a href="https://steemit.com/onelovedtube/@techcoderx/onelovedtube-ipfs-uploader-0-8-3-mobile-optimizations-multi-resolution-upload-support-and-more">Mobile optimizations, multi-resolution upload support and more!</a><br><br>Payout: $51.02</div>