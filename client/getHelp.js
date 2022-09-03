let authorizing = false
const noBlurtWebSignerErr = 'As there is currently no web signer for Blurt that works like HiveSigner, such action is only supported on the web app with Blurt Keychain. If you are a PO of an equivalent app on Blurt, please make a PR on the official Github repo of the uploader.'

function loadAvalonAuthorityStatus(account) {
    if (!config.enableSupport) return
    updateDisplayByIDs(['avalonAuthorizeBtn'],[])
    if (!hasAuthority(account,'avalon','oneloveipfs')) {
        document.getElementById('avalonAuthorizeBtn').innerText = 'Authorize Avalon'
        document.getElementById('avalonAuthorizeBtn').onclick = () => {
            if (authorizing) return
            let tx = {
                type: 29,
                data: {
                    user: config.avalonApp,
                    id: 'support',
                    types: [4,28], // COMMENT, COMMENT_EDIT
                    weight: 1
                }
            }
            let signedtx = javalon.sign(avalonKey,avalonUser,tx)
            authorizing = true
            javalon.sendTransaction(signedtx,(e,r) => {
                authorizing = false
                if (e && e.error == 'invalid signature')
                    return alert('The custom key you used to login does not have NEW_KEY permission')
                else if (e && e.error)
                    return alert(e.error)
                else if (e)
                    return alert(JSON.stringify(e))
                javalon.getAccount(account.name,(e,newacc) => loadAvalonAuthorityStatus(newacc))
            })
        }
    } else {
        document.getElementById('avalonAuthorizeBtn').innerText = 'Revoke Avalon'
        document.getElementById('avalonAuthorizeBtn').onclick = () => {
            if (authorizing) return
            let tx = {
                type: 30,
                data: {
                    user: config.avalonApp,
                    id: 'support'
                }
            }
            let signedtx = javalon.sign(avalonKey,avalonUser,tx)
            authorizing = true
            javalon.sendTransaction(signedtx,(e,r) => {
                authorizing = false
                if (e && e.error == 'invalid signature')
                    return alert('The custom key you used to login does not have REMOVE_KEY permission')
                else if (e && e.error)
                    return alert(e.error)
                else if (e)
                    return alert(JSON.stringify(e))
                javalon.getAccount(account.name,(e,newacc) => loadAvalonAuthorityStatus(newacc))
            })
        }
    }

}

function loadGrapheneAuthorityStatus(account,network) {
    if (!config.enableSupport) return
    updateDisplayByIDs([network + 'AuthorizeBtn'],[])
    let capNetwork = capitalizeFirstLetter(network) // for button label
    if (!hasAuthority(account,network,gtn(network))) {
        document.getElementById(network + 'AuthorizeBtn').innerText = 'Authorize ' + capNetwork
        document.getElementById(network + 'AuthorizeBtn').onclick = () => {
            if (authorizing) return
            if (network === 'hive' && hive_keychain && username) {
                authorizing = true
                hive_keychain.requestAddAccountAuthority(username,config.hivesignerApp,'Posting',1,(result) => {
                    authorizing = false
                    if (!result.error)
                        hive.api.getAccounts([username],(e,r) => loadGrapheneAuthorityStatus(r[0],'hive'))
                    else
                        alert(result.message)
                })
            } else if (network === 'hive') {
                window.open('https://hivesigner.com/authorize/' + config.hivesignerApp)
            } else if (network === 'blurt' && blurt_keychain && blurtUser) {
                authorizing = true
                blurt_keychain.requestAddAccountAuthority(blurtUser,config.blurtApp,'Posting',1,(result) => {
                    authorizing = false
                    if (!result.error)
                        blurt.api.getAccounts([blurtUser],(e,r) => loadGrapheneAuthorityStatus(r[0],'blurt'))
                    else
                        alert(result.message)
                })
            } else if (network === 'blurt') {
                alert(noBlurtWebSignerErr)
            }
        }
    } else {
        document.getElementById(network + 'AuthorizeBtn').innerText = 'Revoke ' + capNetwork
        document.getElementById(network + 'AuthorizeBtn').onclick = () => {
            if (authorizing) return
            if (network == 'hive' && hive_keychain && username) {
                authorizing = true
                hive_keychain.requestRemoveAccountAuthority(username,config.hivesignerApp,'Posting',(result) => {
                    authorizing = false
                    if (!result.error)
                        hive.api.getAccounts([username],(e,r) => loadGrapheneAuthorityStatus(r[0],'hive'))
                    else
                        alert(result.message)
                })
            } else if (network === 'hive') {
                window.open('https://hivesigner.com/revoke/' + config.hivesignerApp)
            } else if (network === 'blurt' && blurt_keychain && blurtUser) {
                authorizing = true
                blurt_keychain.requestRemoveAccountAuthority(blurtUser,config.blurtApp,'Posting',(result) => {
                    authorizing = false
                    if (!result.error)
                        blurt.api.getAccounts([blurtUser],(e,r) => loadGrapheneAuthorityStatus(r[0],'blurt'))
                    else
                        alert(result.message)
                })
            } else if (network === 'blurt') {
                alert(noBlurtWebSignerErr)
            }
        }
    }
}

function gtn(network) {
    switch(network) {
        case 'avalon':
            return config.avalonSupportPub
        case 'hive':
            return config.hivesignerApp
        case 'steem':
            return config.steemloginApp
        case 'blurt':
            return config.blurtApp
        default:
            return ''
    }
}

function hasAuthority(account,network,target) {
    switch (network) {
        case 'avalon':
            if (account.auths)
                for (let i = 0; i < account.auths.length; i++)
                    if (account.auths[i].user === target && account.auths[i].id === 'support' && (account.auths[i].types.includes(4) || account.auths[i].types.includes(28)))
                        return true
            return false
        case 'hive':
        case 'steem':
        case 'blurt':
            for (let i = 0; i < account.posting.account_auths.length; i++)
                if (account.posting.account_auths[i][0] === target)
                    return true
            return false
        default:
            return false
    }
}

function getAvalonKeyID(account) {
    for (let i = 0; i < account.keys.length; i++)
        if (account.keys[i].pub == config.avalonSupportPub)
            return account.keys[i].id
    return null
}