// Load Steem Connect access token to client
var username;
var url = new URL(window.location.href);
var token = url.searchParams.get('access_token'); // Access token for logged in user
if (token == '') {
    // Not logged in or no access token
    restrict();
    alert('Looks like you do not have access to the uploader!');
} else {
    var api = sc2.Initialize({ accessToken: token });
    api.me(function(err,res) {
        username = res.account.name; // Account name
        axios.get('/checkuser?user=' + username).then(function(response) {
            console.log(response);
            if (response.data.isInWhitelist == false) {
                restrict();
                alert('Looks like you do not have access to the uploader!');
            }
        });
    });
}

function restrict() {
    document.getElementById('sourcevideo').disabled = true;
    document.getElementById('snapfile').disabled = true;
    document.getElementById('title').disabled = true;
    document.getElementById('description').disabled = true;
    document.getElementById('tags').disabled = true;
    document.getElementById('powerup').disabled = true;
    document.getElementById('submitbutton').disabled = true;
}

function reenableFields() {
    document.getElementById('sourcevideo').disabled = false;
    document.getElementById('snapfile').disabled = false;
    document.getElementById('title').disabled = false;
    document.getElementById('description').disabled = false;
    document.getElementById('tags').disabled = false;
    document.getElementById('powerup').disabled = false;
    document.getElementById('submitbutton').disabled = false;
}

function submitVideo() {
    // Validate data entered
    var description = document.getElementById('description').value;
    var powerup = document.getElementById('powerup').checked;
    var permlink = generatePermlink();

    var sourceVideo = document.getElementById('sourcevideo').files;
    var snap = document.getElementById('snapfile').files;

    var title = document.getElementById('title').value;
    if (title.length > 256) {
        alert('Title is too long!');
        return;
    }
    var tag = document.getElementById('tags').value;
    if (/^[a-z0-9- _]*$/.test(tag) == false){
        alert('Invalid tags!')
        return;
    }

    var tags = tag.split(' ');
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

    var contentType = {
        headers: {
            "content-type": "multipart/form-data"
        }
    };
    axios.post('/videoupload',formdata,contentType).then(function(response) {
        var uploaderResponse = response.data;
        console.log(uploaderResponse);

        // Post to Steem blockchain
        let transaction = generatePost(username,permlink,uploaderResponse.ipfshash,uploaderResponse.snaphash,uploaderResponse.spritehash,title,description,tags,uploaderResponse.duration,uploaderResponse.filesize,powerup,uploaderResponse.dtubefees);
        api.broadcast(transaction,function(err) {
            if (err != null) {
                alert('Failed to post on DTube: ' + err);
                reenableFields();
            } else {
                window.location.replace('https://d.tube/v/' + username + '/' + permlink);
            }
        });
    }).catch(function(err) {
        alert('Upload error: ' + err);
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

function buildPostBody(author,permlink,videoHash,snapHash,description) {
    return '<center><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'><img src=\'https://cloudflare-ipfs.com/ipfs/' + snapHash + '\'></a></center><hr>\n\n' + description + '\n\n<hr><a href=\'https://d.tube/#!/v/' + author + '/' + permlink + '\'> ▶️ DTube</a><br /><a href=\'https://cloudflare-ipfs.com/ipfs/' + videoHash + '\'> ▶️ IPFS</a>'
}

function buildJsonMetadata(sourceHash,snapHash,spriteHash,title,description,DTubeTags,duration,filesize,author,permlink) {
    var SteemTags = DTubeTags;
    SteemTags.push('dtube');

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
            },
            content: {
                videohash: sourceHash,
                description: description,
                tags: DTubeTags,
            },
        },
        tags: SteemTags,
        app: 'onelovedtube/0.8',
    }
    return jsonMeta;
}

function generatePost(username,permlink,sourceHash,snapHash,spriteHash,title,description,tags,duration,filesize,powerUp,dtubefees) {
    // Power up all rewards or not
    var percentSBD = 10000;
    if (powerUp == true) {
        percentSBD = 0;
    }

    // Create transaction to post on Steem blockchain
    let operations = [
        [ 'comment', {
                parent_author: '',
                parent_permlink: tags[0],
                author: username,
                permlink: permlink,
                title: title,
                body: buildPostBody(username,permlink,sourceHash,snapHash,description),
                json_metadata: JSON.stringify(buildJsonMetadata(sourceHash,snapHash,spriteHash,title,description,tags,duration,filesize,username,permlink)),
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
