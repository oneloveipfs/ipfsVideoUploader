function loadPins(type) {
    document.getElementById('hashesTbody').innerHTML = ''
    let call = '/pinsByType?user=' + username + '&hashtype=' + type
    if (!avalonUser || !hiveDisplayUser)
        call += '&network='+window.currentnetwork
    axios.get(call).then(res => {
        let renderer = new TbodyRenderer()
        let totalSize = 0
        for (let i = 0; i < res.data.length; i++) {
            renderer.appendRow('<a target="_blank" rel="noreferrer" href="https://video.oneloveipfs.com/ipfs/'+res.data[i].cid+'">'+res.data[i].cid+'</a>',abbrevateFilesize(res.data[i].size))
            totalSize += res.data[i].size
        }
        document.getElementById('hashesTbody').innerHTML = renderer.renderRow()
        document.getElementById('yourFilesTotalSize').innerText = 'Total Size: ' + abbrevateFilesize(totalSize)
    }).catch(e => console.log(e))
}

function handleTypeSelection(selected) {
    switch (selected.selectedIndex) {
        case 0:
            loadPins('videos')
            break
        case 1:
            loadPins('video240')
            break
        case 2:
            loadPins('video480')
            break
        case 3:
            loadPins('video720')
            break
        case 4:
            loadPins('video1080')
            break
        case 5:
            loadPins('hls')
            break
        case 6:
            loadPins('thumbnails')
            break
        case 7:
            loadPins('sprites')
            break
        case 8:
            loadPins('subtitles')
            break
        case 9:
            loadPins('images')
            break
        default:
            break
    }
}