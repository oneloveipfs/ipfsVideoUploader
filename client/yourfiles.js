function loadPins(type) {
    document.getElementById('hashesTbody').innerHTML = ''
    let call = '/pinsByType?user=' + username + '&hashtype=' + type
    if (dtconly == 'true')
        call += '&network=dtc'
    else if (!avalonUser || !avalonKey || username != avalonUser)
        call += '&network=hive'
    axios.get(call).then(res => {
        let htmlResult = ''
        for (let i = 0; i < res.data.length; i++)
            htmlResult += '<tr><td><a target="_blank" rel="noreferrer" href="https://video.oneloveipfs.com/ipfs/' + res.data[i].cid + '">' + res.data[i].cid + '</a></td><td>' + abbrevateFilesize(res.data[i].size) + '</td></tr>'
        document.getElementById('hashesTbody').innerHTML = htmlResult
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