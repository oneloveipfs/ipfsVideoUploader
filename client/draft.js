// Convert to multi-drafts
function convertDraft() {
    let savedTitle = localStorage.getItem('OneLoveTitle')
    let savedDescription = localStorage.getItem('OneLoveDescription')
    let savedTags = localStorage.getItem('OneLoveTags')
    let savedPostBody = localStorage.getItem('OneLovePostBody')
    let savedGraphenePermlink = localStorage.getItem('DraftGraphenePermlink')
    let savedSteemBenefs = localStorage.getItem('DraftSteemBeneficiaries')
    let savedHiveBenefs = localStorage.getItem('DraftHiveBeneficiaries')
    let savedPowerUp = localStorage.getItem('DraftPowerUp')
    let savedSkynetUpload = localStorage.getItem('DraftSkynetUpload')

    if (savedTitle || savedDescription || savedTags || savedPostBody) {
        let pm = savedGraphenePermlink || generatePermlink()
        let newDraftObj = {
            title: savedTitle,
            desc: savedDescription,
            tags: savedTags,
            body: savedPostBody,
            powerup: savedPowerUp === 'true',
            skynet: savedSkynetUpload === 'true',
            createdTs: new Date().getTime(),
            lastTs: new Date().getTime()
        }
        if (savedSteemBenefs) {
            try {
                newDraftObj.steemBeneficiaries =  JSON.parse(savedSteemBenefs)
            } catch {}
        }
        if (savedHiveBenefs) {
            try {
                newDraftObj.hiveBeneficiaries = JSON.parse(savedHiveBenefs)
            } catch {}
        }
        localStorage.setItem('Draft_'+pm,JSON.stringify(newDraftObj))
        
        // clear old drafts
        localStorage.removeItem('OneLoveTitle')
        localStorage.removeItem('OneLoveDescription')
        localStorage.removeItem('OneLoveTags')
        localStorage.removeItem('OneLovePostBody')
        localStorage.removeItem('OneLoveSubtitles')
        localStorage.removeItem('DraftGraphenePermlink')
        localStorage.removeItem('DraftSteemBeneficiaries')
        localStorage.removeItem('DraftHiveBeneficiaries')
        localStorage.removeItem('DraftBlurtBeneficiaries')
        localStorage.removeItem('DraftSteemCommunity')
        localStorage.removeItem('DraftHiveCommunity')
        localStorage.removeItem('DraftPowerUp')
        localStorage.removeItem('DraftSkynetUpload')
    }
}

function listDrafts() {
    document.getElementById('draftListTbody').innerHTML = ''
    let results = []
    for (let i = 0; i < localStorage.length; i++) {
        let k = localStorage.key(i)
        if (k.startsWith('Draft_')) {
            try {
                let d = JSON.parse(localStorage.getItem(k))
                d.pm = k.replace('Draft_','')
                results.push(d)
            } catch {}
        }
    }
    if (results.length === 0)
        return updateDisplayByIDs(['draftEmpty'],['draftTable'])
    results.sort((a,b) => a.lastTs - b.lastTs)
    let resultBody = new TbodyRenderer()
    for (let i in results)
        resultBody.appendRow(
            results[i].pm,
            new Date(results[i].createdTs).toLocaleString(),
            new Date(results[i].lastTs).toLocaleString(),
            `<a class="styledButton styledButtonSmall" style="width: 50px;" onclick="retrieveDraft('${results[i].pm}')">Load</a>`,
            `<a class="styledButton styledButtonSmall" style="width: 65px;" onclick="localStorage.removeItem('Draft_${results[i].pm}'); listDrafts();">Delete</a>`)
    updateDisplayByIDs(['draftTable'],['draftEmpty'],'table')
    document.getElementById('draftListTbody').innerHTML = resultBody.renderRow()
}

function retrieveDraft(pm) {
    let draftObj = {}
    try {
        draftObj = JSON.parse(localStorage.getItem('Draft_'+pm))
    } catch {
        return false
    }

    if (draftObj.title)
        document.getElementById('title').value = draftObj.title
    if (draftObj.desc)
        document.getElementById('description').value = draftObj.desc
    if (draftObj.tags)
        document.getElementById('tags').value = draftObj.tags
    if (draftObj.body)
        document.getElementById('postBody').value = draftObj.body
    if (draftObj.subtitles) {
        subtitleList = draftObj.subtitles
        updateSubtitle()
    }
    document.getElementById('customPermlink').value = pm
    if (Array.isArray(draftObj.steemBeneficiaries))
        for (let b in draftObj.steemBeneficiaries)
            steemBeneficiaries.addAccount(draftObj.steemBeneficiaries[b].account,draftObj.steemBeneficiaries[b].weight)
    if (Array.isArray(draftObj.hiveBeneficiaries))
        for (let b in draftObj.hiveBeneficiaries)
            hiveBeneficiaries.addAccount(draftObj.hiveBeneficiaries[b].account,draftObj.hiveBeneficiaries[b].weight)
    if (Array.isArray(draftObj.blurtBeneficiaries))
        for (let b in draftObj.blurtBeneficiaries)
            blurtBeneficiaries.addAccount(draftObj.blurtBeneficiaries[b].account,draftObj.blurtBeneficiaries[b].weight)
    if (draftObj.steemCommunity)
        document.getElementById('steemCommunitySelect').value = draftObj.steemCommunity
    if (draftObj.hiveCommunity)
        document.getElementById('hiveCommunitySelect').value = draftObj.hiveCommunity
    if (draftObj.blurtCommunity)
        document.getElementById('blurtCommunitySelect').value = draftObj.blurtCommunity
    if (draftObj.powerup)
        document.getElementById('powerup').checked = true
    if (draftObj.skynet)
        document.getElementById('skynetupload').checked = true
    sessionStorage.setItem('editingDraft',pm)
    document.getElementById('newUploadModeBtn').onclick()
    document.getElementById('editingDraftMsg').innerText = 'Editing draft: '+pm+', last saved: '+new Date(draftObj.lastTs).toLocaleString()
    updateDisplayByIDs(['editingDraft'],[])
}

function saveDraft() {
    let pm = document.getElementById('customPermlink').value || generatePermlink()
    let newDraftObj = {
        title: document.getElementById('title').value,
        desc: document.getElementById('description').value,
        tags: document.getElementById('tags').value,
        body: document.getElementById('postBody').value,
        subtitles: subtitleList,
        powerup: document.getElementById('powerup').checked,
        skynet: document.getElementById('skynetupload').checked,
        steemBeneficiaries: steemBeneficiaries.accounts,
        steemCommunity: document.getElementById('steemCommunitySelect').value,
        hiveBeneficiaries: hiveBeneficiaries.accounts,
        hiveCommunity: document.getElementById('hiveCommunitySelect').value,
        blurtBeneficiaries: blurtBeneficiaries.accounts,
        blurtCommunity: document.getElementById('blurtCommunitySelect').value,
        createdTs: new Date().getTime(),
        lastTs: new Date().getTime()
    }
    let previousDraft = localStorage.getItem('Draft_'+sessionStorage.getItem('editingDraft'))
    try {
        previousDraft = JSON.parse(previousDraft)
        if (previousDraft.createdTs)
            newDraftObj.createdTs = previousDraft.createdTs
    } catch {}
    if (sessionStorage.getItem('editingDraft') !== pm)
        localStorage.removeItem('Draft_'+sessionStorage.getItem('editingDraft'))
    if (!document.getElementById('customPermlink').value)
        document.getElementById('customPermlink').value = pm
    sessionStorage.setItem('editingDraft',pm)
    localStorage.setItem('Draft_'+pm,JSON.stringify(newDraftObj))
    document.getElementById('editingDraftMsg').innerText = 'Editing draft: '+pm+', last saved: '+new Date(newDraftObj.lastTs).toLocaleString()
    updateDisplayByIDs(['editingDraft'],[])
}

function leaveDraft() {
    sessionStorage.removeItem('editingDraft')
    updateDisplayByIDs([],['editingDraft'])
}