let updates = [
    {
        created: "27 October 2018",
        version: "0.8.0",
        description: "Original release",
        link: "https://hive.blog/onelovedtube/@techcoderx/introducing-onelovedtube-ipfs-video-uploader-an-alternative-way-of-posting-videos-onto-dtube",
        payout: "$17.34"
    }, {
        created: "26 November 2018",
        version: "0.8.1",
        description: "Progress bars, metadata drafts and more!",
        link: "https://hive.blog/onelovedtube/@techcoderx/onelovedtube-alternative-ipfs-video-uploader-update-v0-8-1-progress-bars-metadata-drafts-and-more",
        payout: "$21.26"
    }, {
        created: "20 December 2018",
        version: "0.8.2",
        description: "Introducing hashes and usage APIs",
        link: "https://hive.blog/onelovedtube/@techcoderx/onelovedtube-ipfs-video-uploader-0-8-2-say-hello-to-apis",
        payout: "$1.37"
    }, {
        created: "17 January 2019",
        version: "0.8.3",
        description: "Mobile optimizations, multi-resolution upload support and more!",
        link: "https://hive.blog/onelovedtube/@techcoderx/onelovedtube-ipfs-uploader-0-8-3-mobile-optimizations-multi-resolution-upload-support-and-more",
        payout: "$51.02"
    }, {
        created: "16 February 2019",
        version: "0.8.4",
        description: "Keychain auth support, updated homepage and more!",
        link: "https://hive.blog/onelovedtube/@techcoderx/onelovedtube-ipfs-uploader-v0-8-4-keychain-auth-support-updated-homepage-and-more",
        payout: "$35.17"
    }, {
        created: "20 April 2019",
        version: "0.8.5",
        description: "Getting ready for the new DTube.",
        link: "https://hive.blog/onelovedtube/@techcoderx/onelovedtube-ipfs-uploader-v0-8-5-getting-ready-for-the-new-dtube",
        payout: "$31.21"
    }, {
        created: "24 June 2019",
        version: "0.9b1",
        description: "Introducing support for Avalon testnet.",
        link: "https://hive.blog/onelovedtube/@techcoderx/onelovedtube-uploader-v0-9-beta-1-introducing-support-for-avalon-testnet",
        payout: "$32.70"
    }, {
        created: "12 February 2020",
        version: "0.9.2",
        description: "Performance optimisations, upload event API and more!",
        link: "https://hive.blog/ipfs/@techcoderx/oneloveipfs-uploader-v0-9-2-optimisations-real-time-upload-event-api-and-more",
        payout: "$3.41"
    }, {
        created: "21 March 2020",
        version: "0.9.3",
        description: "Welcome Hive & resumable uploads API",
        link: "https://hive.blog/ipfs/@techcoderx/oneloveipfs-uploader-v0-9-3-welcome-hive-blockchain-and-resumable-uploads-api",
        payout: "$2.64"
    }, {
        created: "17 April 2020",
        version: "0.9.4",
        description: "Skynet uploads & new payment system",
        link: "https://hive.blog/hive-134220/@techcoderx/oneloveipfs-uploader-v0-9-4-skynet-uploads-and-new-payment-system",
        payout: "$1.74"
    }, {
        created: "17 June 2020",
        version: "1.0",
        description: "New landing page & some API changes",
        link: "https://hive.blog/hive-134220/@onelovedtube/oneloveipfs-uploader-v1-0-new-landing-page-and-some-api-changes",
        payout: "$2.97"
    }, {
        created: "3 October 2020",
        version: "1.0.1",
        description: "A post-mainnet update",
        link: "https://hive.blog/hive-134220/@onelovedtube/oneloveipfs-uploader-v1-0-1-a-post-mainnet-update",
        payout: "$1.82"
    }, {
        created: "21 December 2020",
        version: "2.0",
        description: "The next generation of IPFS video hosting",
        link: "https://hive.blog/hive-134220/@onelovedtube/oneloveipfs-uploader-v2-the-next-generation-of-ipfs-video-hosting-is-here",
        payout: "$0.49"
    }, {
        created: "26 December 2022",
        version: "3.0",
        description: "Onboarding new platforms and highly requested features",
        link: "https://hive.blog/hive-134220/@techcoderx/oneloveipfs-uploader-v3-onboarding-new-platforms-and-highly-requested-features",
        payout: "$11.25"
    }
]

window.addEventListener('scroll',() => {
    if (window.scrollY > 200) {
        document.getElementById('homepageheader').style.visibility = 'visible'
        document.getElementById('homepageheader').style.opacity = 1
    } else {
        document.getElementById('homepageheader').style.visibility = 'hidden'
        document.getElementById('homepageheader').style.opacity = 0
    }
})

// Release notes
document.addEventListener('DOMContentLoaded', () => {
    updateLogs()
    for (let i = updates.length - 1; i >= 0; i--) if (updates[i].payout === 'Pending') {
        let author = updates[i].link.split('/')[4].substr(1)
        let permlink = updates[i].link.split('/')[5]
        getGrapheneContent('hive',author,permlink).then(ct => {
            let totalpayout = parseFloat(ct.curator_payout_value.replace(' HBD','')) + parseFloat(ct.total_payout_value.replace(' HBD','')) + parseFloat(ct.pending_payout_value.replace(' HBD',''))
            updates[i].payout = "$" + Math.round(totalpayout*100)/100
            updateLogs()
        }).catch(() => {})
    }
    if (isElectron())
        updateDisplayByIDs([],['appIntro'])
})

// Load general uploader stats
axios.get('/stats').then((counter) => {
    document.getElementById('uploadCount').innerText = thousandSeperator(counter.data.count)
    document.getElementById('usageCount').innerText = abbrevateFilesize(counter.data.usage)
    document.getElementById('userCount').innerText = thousandSeperator(counter.data.usercount)
})

function updateLogs() {
    let updatesHTML = ''
    for (let i = updates.length - 1; i >= 0; i--)
        updatesHTML += '<div class="updatelogitem"><div class="updatelog">Version ' + updates[i].version + '<br>Released ' + updates[i].created + '<br><br><a href="' + updates[i].link + '" target="_blank">' + updates[i].description + '</a><div class="updatepayout">Payout: ' + updates[i].payout + '</div></div></div>'
    document.getElementById('updatesContainer').innerHTML = updatesHTML
}

function saveAPIBtn() {
    saveAPISelections()
    dismissPopupAction('apiSettingsPopup')
}