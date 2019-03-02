// Load Steem Connect access token to client
var username;
let url = new URL(window.location.href)
let token = url.searchParams.get('access_token') // Access token for logged in user
let iskeychain = url.searchParams.get('keychain')
if (token == null) {
    // Not logged in or no access token
    window.setTimeout(function() {
        document.getElementById('loggedInUser').innerHTML = 'You are not logged in!';
        restrict();
    },100);
} else if (iskeychain == 'true') {
    // Steem Keychain Login
    axios.get('/auth?access_token=' + token).then((authResponse) => {
        if (authResponse.data.error != null) {
            alert(authResponse.data.error)
            document.getElementById('loggedInUser').innerHTML = 'Not authorized'
            restrict()
        } else {
            username = authResponse.data.user
            document.getElementById('loggedInUser').innerHTML = 'You are logged in as ' + username
            retrieveDraft()
        }
    })
} else {
    // SteemConnect login
    var api = sc2.Initialize({ accessToken: token });
    api.me(function(err,res) {
        username = res.account.name; // Account name
        document.getElementById('loggedInUser').innerHTML = 'You are logged in as ' + username;
        axios.get('/checkuser?user=' + username).then(function(response) {
            console.log(response);
            if (response.data.isInWhitelist == false) {
                restrict();
                alert('Looks like you do not have access to the uploader!');
                return;
            }

            // Retrieve metadata from draft if any
            retrieveDraft()
        });
    });
}

function tabBasicsClicked() {
    document.getElementById('advanced').style.display = "none";
    document.getElementById('basics').style.display = "block";
    document.getElementById('tabAdvanced').style.backgroundColor = "transparent"
    document.getElementById('tabBasics').style.backgroundColor = "#2196F3";
    return true;
}

function tabAdvancedClicked() {
    document.getElementById('advanced').style.display = "block";
    document.getElementById('basics').style.display = "none";
    document.getElementById('tabAdvanced').style.backgroundColor = "#2196F3"
    document.getElementById('tabBasics').style.backgroundColor = "transparent";
    return true;
}

function restrict() {
    document.getElementById('sourcevideo').disabled = true;
    document.getElementById('snapfile').disabled = true;
    document.getElementById('title').disabled = true;
    document.getElementById('description').disabled = true;
    document.getElementById('tags').disabled = true;
    document.getElementById('powerup').disabled = true;
    document.getElementById('postBody').disabled = true;
    document.getElementById('postImgBtn').disabled = true;
    document.getElementById('draftBtn').disabled = true;
    document.getElementById('submitbutton').disabled = true;
}

function restrictImg() {
    document.getElementById('postBody').disabled = true;
    document.getElementById('postImgBtn').disabled = true;
    document.getElementById('draftBtn').disabled = true;
    document.getElementById('submitbutton').disabled = true;
}

function reenableFields() {
    document.getElementById('sourcevideo').disabled = false;
    document.getElementById('snapfile').disabled = false;
    document.getElementById('title').disabled = false;
    document.getElementById('description').disabled = false;
    document.getElementById('tags').disabled = false;
    document.getElementById('powerup').disabled = false;
    document.getElementById('postBody').disabled = false;
    document.getElementById('postImgBtn').disabled = false;
    document.getElementById('draftBtn').disabled = false;
    document.getElementById('submitbutton').disabled = false;
}

function reenableFieldsImg() {
    document.getElementById('postBody').disabled = false;
    document.getElementById('postImgBtn').disabled = false;
    document.getElementById('draftBtn').disabled = false;
    document.getElementById('submitbutton').disabled = false;
}

function submitVideo() {
    // Validate data entered
    let postBody = document.getElementById('postBody').value;
    let description = document.getElementById('description').value;
    let powerup = document.getElementById('powerup').checked;
    let permlink = generatePermlink();

    let sourceVideo = document.getElementById('sourcevideo').files;
    let snap = document.getElementById('snapfile').files;

    let video240 = document.getElementById('video240p').files;
    let video480 = document.getElementById('video480p').files;
    let video720 = document.getElementById('video720p').files;
    let video1080 = document.getElementById('video1080p').files;

    let title = document.getElementById('title').value;
    if (title.length > 256) {
        alert('Title is too long!');
        return;
    }
    let tag = document.getElementById('tags').value;
    if (/^[a-z0-9- _]*$/.test(tag) == false){
        alert('Invalid tags!')
        return;
    }

    let tags = tag.split(' ');
    if (tags.length > 4) {
        alert('Please do not use more than 4 tags!');
        return;
    }

    // Check for empty fields
    if (sourceVideo.length == 0) {
        alert('Please upload a video!');
        return;
    }

    if (snap.length == 0) {
        alert('Please upload a thumbnail for your video!');
        return;
    }

    if (title.length == 0) {
        alert('Please enter a title!');
        return;
    }

    if (tag.length == 0) {
        alert('Please enter some tags (up to 4) for your video!');
        return;
    }

    restrict();

    // Upload video
    var formdata = new FormData();
    formdata.append('VideoUpload',sourceVideo[0]);
    formdata.append('SnapUpload',snap[0]);
    formdata.append('Username',username);

    if (video240.length > 0)
        formdata.append('Video240Upload',video240[0]);
    if (video480.length > 0)
        formdata.append('Video480Upload',video480[0]);
    if (video720.length > 0)
        formdata.append('Video720Upload',video720[0]);
    if (video1080.length > 0)
        formdata.append('Video1080Upload',video1080[0]);

    var progressbar = document.getElementById('progressBarBack');
    var progressbarInner = document.getElementById('progressBarFront');
    progressbar.style.display = "block";
    progressbarInner.innerHTML = "Uploading... (0%)";

    var contentType = {
        headers: {
            "content-type": "multipart/form-data"
        },
        onUploadProgress: function (progressEvent) {
            console.log(progressEvent);

            var progressPercent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            updateProgressBar(progressPercent);
        }
    };
    axios.post('/videoupload',formdata,contentType).then(function(response) {
        var uploaderResponse = response.data;
        console.log(uploaderResponse);

        progressbarInner.innerHTML = 'Submitting video to Steem blockchain...'

        // Post to Steem blockchain
        let transaction = generatePost(username,permlink,postBody,uploaderResponse.ipfshash,uploaderResponse.snaphash,uploaderResponse.spritehash,uploaderResponse.ipfs240hash,uploaderResponse.ipfs480hash,uploaderResponse.ipfs720hash,uploaderResponse.ipfs1080hash,title,description,tags,uploaderResponse.duration,uploaderResponse.filesize,powerup,uploaderResponse.dtubefees);
        if (iskeychain == 'true') {
            // Broadcast with Keychain
            steem_keychain.requestBroadcast(username,transaction,'Posting',(response) => {
                if (response.error != null) {
                    alert('Failed to post on DTube: ' + response.error + '\n\nHere are the details of the upload for your reference:\nIPFS hash: ' + uploaderResponse.ipfshash + '\nThumbnail hash: ' + uploaderResponse.snaphash + '\nSprite hash: ' + uploaderResponse.spritehash + '\nVideo duration: ' + uploaderResponse.duration + '\nVideo filesize: ' + uploaderResponse.filesize);
                    progressbar.style.display = "none";
                    reenableFields();
                } else {
                    localStorage.clear();
                    window.location.replace('https://d.tube/v/' + username + '/' + permlink);
                }
            })
        } else {
            // Broadcast with SteemConnect
            api.broadcast(transaction,function(err) {
                if (err != null) {
                    alert('Failed to post on DTube: ' + err + '\n\nHere are the details of the upload for your reference:\nIPFS hash: ' + uploaderResponse.ipfshash + '\nThumbnail hash: ' + uploaderResponse.snaphash + '\nSprite hash: ' + uploaderResponse.spritehash + '\nVideo duration: ' + uploaderResponse.duration + '\nVideo filesize: ' + uploaderResponse.filesize);
                    progressbar.style.display = "none";
                    reenableFields();
                } else {
                    localStorage.clear();
                    window.location.replace('https://d.tube/v/' + username + '/' + permlink);
                }
            });
        }
    }).catch(function(err) {
        alert('Upload error: ' + err);
        progressbar.style.display = "none";
        reenableFields();
    });
}

function generatePermlink() {
    var permlink = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 8; i++) {
        permlink += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return permlink;
}

function buildPostBody(author,permlink,postBody,videoHash,snapHash,description) {
    if (postBody == '') {
        return '<center><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'><img src=\'https://cloudflare-ipfs.com/ipfs/' + snapHash + '\'></a></center><hr>\n\n' + description + '\n\n<hr><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'> ▶️ DTube</a><br /><a href=\'https://ipfs.io/ipfs/' + videoHash + '\'> ▶️ IPFS</a>'
    } else {
        return '<center><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'><img src=\'https://cloudflare-ipfs.com/ipfs/' + snapHash + '\'></a></center><hr>\n\n' + postBody + '\n\n<hr><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'> ▶️ DTube</a><br /><a href=\'https://ipfs.io/ipfs/' + videoHash + '\'> ▶️ IPFS</a>'
    }
}

function buildJsonMetadata(sourceHash,snapHash,spriteHash,video240Hash,video480Hash,video720Hash,video1080Hash,title,description,DTubeTags,duration,filesize,author,permlink) {
    // 'dtube' tag as first tag for Steemit post
    var SteemTags = ['dtube'];
    SteemTags = SteemTags.concat(DTubeTags);

    var jsonMeta = {
        video: {
            info: {
                title: title,
                snaphash: snapHash,
                author: author,
                permlink: permlink,
                duration: duration,
                filesize: filesize,
                spritehash: spriteHash,
                provider: 'onelovedtube/0.8.4',
            },
            content: {
                videohash: sourceHash,
                video240hash: video240Hash,
                video480hash: video480Hash,
                video720hash: video720Hash,
                video1080hash: video1080Hash,
                description: description,
                tags: DTubeTags,
            },
        },
        tags: SteemTags,
        app: 'onelovedtube/0.8.4',
    }
    return jsonMeta;
}

function generatePost(username,permlink,postBody,sourceHash,snapHash,spriteHash,video240Hash,video480Hash,video720Hash,video1080Hash,title,description,tags,duration,filesize,powerUp,dtubefees) {
    // Power up all rewards or not
    var percentSBD = 10000;
    if (powerUp == true) {
        percentSBD = 0;
    }

    // Create transaction to post on Steem blockchain
    let operations = [
        [ 'comment', {
                parent_author: '',
                parent_permlink: 'dtube',
                author: username,
                permlink: permlink,
                title: title,
                body: buildPostBody(username,permlink,postBody,sourceHash,snapHash,description),
                json_metadata: JSON.stringify(buildJsonMetadata(sourceHash,snapHash,spriteHash,video240Hash,video480Hash,video720Hash,video1080Hash,title,description,tags,duration,filesize,username,permlink)),
            }
        ],
        [ "comment_options", {
            author: username,
            permlink: permlink,
            max_accepted_payout: '1000000.000 SBD',
            percent_steem_dollars: percentSBD,
            allow_votes: true,
            allow_curation_rewards: true,
            extensions: [
                [0, {
                    beneficiaries: [{
                        account: 'dtube',
                        weight: dtubefees
                    }]
                }]
            ]
        }]
    ];
    return operations;
}

function uploadImage() {
    let postImg = document.getElementById('postImg').files;
    if (postImg.length == 0) {
        // do not upload if no images are selected
        return;
    }

    var imgFormData = new FormData();
    imgFormData.append('postImg',postImg[0]);
    imgFormData.append('username',username);

    restrictImg();

    var progressbar = document.getElementById('progressBarBack');
    var progressbarInner = document.getElementById('progressBarFront');
    progressbar.style.display = "block";
    progressbarInner.innerHTML = "Uploading... (0%)";

    var contentType = {
        headers: {
            "content-type": "multipart/form-data"
        },
        onUploadProgress: function (progressEvent) {
            console.log(progressEvent);

            var progressPercent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            updateProgressBar(progressPercent);
        }
    };
    axios.post('/imageupload',imgFormData,contentType).then(function(response) {
        console.log(response);
        progressbar.style.display = "none";
        document.getElementById('postBody').value += ('\n![' + document.getElementById('postImg').value.replace(/.*[\/\\]/, '') + '](https://cloudflare-ipfs.com/ipfs/' + response.data.imghash + ')');
        reenableFieldsImg();
    }).catch(function(err) {
        alert('Upload error: ' + err);
        progressbar.style.display = "none";
        reenableFieldsImg();
    })
}

function updateProgressBar(progress) {
    var progressbarInner = document.getElementById('progressBarFront');
    progressbarInner.style.width = progress + '%';
    progressbarInner.innerHTML = 'Uploading... (' + progress + '%)';
}

function saveAsDraft() {
    localStorage.setItem('OneLoveTitle',document.getElementById('title').value);
    localStorage.setItem('OneLoveDescription',document.getElementById('description').value);
    localStorage.setItem('OneLoveTags',document.getElementById('tags').value);
    localStorage.setItem('OneLovePostBody',document.getElementById('postBody').value);
    alert('Metadata saved as draft!')
}

function retrieveDraft() {
    let savedTitle = localStorage.getItem('OneLoveTitle')
    let savedDescription = localStorage.getItem('OneLoveDescription')
    let savedTags = localStorage.getItem('OneLoveTags')
    let savedPostBody = localStorage.getItem('OneLovePostBody')

    if (savedTitle != null) {
        document.getElementById('title').value = savedTitle
    }

    if (savedDescription != null) {
        document.getElementById('description').value = savedDescription
    }

    if (savedTags != null) {
        document.getElementById('tags').value = savedTags
    }

    if (savedPostBody != null) {
        document.getElementById('postBody').value = savedPostBody
    }
}