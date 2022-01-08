let authorizing = false

function loadAvalonAuthorityStatus(account) {
    if (!config.enableSupport) return
    updateDisplayByIDs(['avalonAuthorizeBtn'],[])
    if (!hasAuthority(account,'avalon')) {
        document.getElementById('avalonAuthorizeBtn').innerText = 'Authorize Avalon'
        document.getElementById('avalonAuthorizeBtn').onclick = () => {
            if (authorizing) return
            let tx = {
                type: 10,
                data: {
                    id: 'OneLoveIPFS support',
                    pub: config.avalonSupportPub,
                    types: [4] // COMMENT
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
                type: 11,
                data: {
                    id: getAvalonKeyID(account)
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
    if (!hasAuthority(account,network)) {
        document.getElementById(network + 'AuthorizeBtn').innerText = 'Authorize ' + capNetwork
        document.getElementById(network + 'AuthorizeBtn').onclick = () => {
            if (authorizing) return
            if (network == 'steem' && steem_keychain && steemUser) {
                authorizing = true
                steem_keychain.requestAddAccountAuthority(steemUser,config.steemloginApp,'Posting',1,(result) => {
                    authorizing = false
                    if (!result.error)
                        steem.api.getAccounts([steemUser],(e,r) => loadGrapheneAuthorityStatus(r[0],'steem'))
                    else
                        alert(result.message)
                })
            } else if (network == 'steem') {
                window.open('https://steemlogin.com/authorize/' + config.steemloginApp)
            } else if (network == 'hive' && hive_keychain && username) {
                authorizing = true
                hive_keychain.requestAddAccountAuthority(username,config.hivesignerApp,'Posting',1,(result) => {
                    authorizing = false
                    if (!result.error)
                        hive.api.getAccounts([username],(e,r) => loadGrapheneAuthorityStatus(r[0],'hive'))
                    else
                        alert(result.message)
                })
            } else if (network == 'hive') {
                window.open('https://hivesigner.com/authorize/' + config.hivesignerApp)
            }
        }
    } else {
        document.getElementById(network + 'AuthorizeBtn').innerText = 'Revoke ' + capNetwork
        document.getElementById(network + 'AuthorizeBtn').onclick = () => {
            if (authorizing) return
            if (network == 'steem' && steem_keychain && steemUser) {
                authorizing = true
                steem_keychain.requestRemoveAccountAuthority(steemUser,config.steemloginApp,'Posting',(result) => {
                    authorizing = false
                    if (!result.error)
                        steem.api.getAccounts([steemUser],(e,r) => loadGrapheneAuthorityStatus(r[0],'steem'))
                    else
                        alert(result.message)
                })
            } else if (network == 'steem') {
                window.open('https://steemlogin.com/revoke/' + config.steemloginApp)
            } else if (network == 'hive' && hive_keychain && username) {
                authorizing = true
                hive_keychain.requestRemoveAccountAuthority(username,config.hivesignerApp,'Posting',(result) => {
                    authorizing = false
                    if (!result.error)
                        hive.api.getAccounts([username],(e,r) => loadGrapheneAuthorityStatus(r[0],'hive'))
                    else
                        alert(result.message)
                })
            } else if (network == 'hive') {
                window.open('https://hivesigner.com/revoke/' + config.hivesignerApp)
            }
        }
    }
}

function hasAuthority(account,network) {
    switch (network) {
        case 'avalon':
            for (let i = 0; i < account.keys.length; i++)
                if (account.keys[i].pub == config.avalonSupportPub && account.keys[i].types.includes(4))
                    return true
            return false
        case 'hive':
            for (let i = 0; i < account.posting.account_auths.length; i++)
                if (account.posting.account_auths[i][0] == config.hivesignerApp)
                    return true
            return false
        case 'steem':
            for (let i = 0; i < account.posting.account_auths.length; i++)
                if (account.posting.account_auths[i][0] == config.steemloginApp) 
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