// Hive, Steem and Blurt beneficiaries
class Beneficiaries {
    constructor(network) {
        this.accounts = []
        this.total = 0
        this.maxAccounts = 8
        this.maxWeight = 10000
        this.network = network
        this.threespeak = false
        this.threespeakEncoder = ''
    }

    addAccount(account,weight) {
        if (!account || !weight) throw 'No account or weight?'
        if (this.accounts.length === this.maxAccounts) throw 'Maximum number of beneficiary accounts is '+this.maxAccounts+'.'
        if (account == username) throw 'Cannot set beneficiary to own account.'
        if (weight <= 0) throw 'Beneficiary percentage must be more than 0.'
        if (this.total + weight > this.maxWeight) throw 'Cannot set beneficiaries totalling more than 100%.'
        for (let i = 0; i < this.accounts.length; i++)
            if (this.accounts[i].account == account)
                throw 'Account specified already added as beneficiaries.'
        
        this.accounts.push({
            account: account,
            weight: weight
        })
        this.total += weight
        this.updateBeneficiaries()
            
        // Reset new beneficiary text fields
        document.getElementById('newBeneficiaryUser').value = ''
        document.getElementById('newBeneficiaryPercent').value = ''
    }

    removeAccount(account) {
        for (let i = 0; i < this.accounts.length; i++)
            if (this.accounts[i].account == account) {
                this.total -= this.accounts[i].weight
                this.accounts.splice(i,1)
                return this.updateBeneficiaries()
            }
    }

    enable3Speak() {
        if (this.network !== 'hive') throw '3speak is only supported on hive'
        this.threespeak = true
        this.maxAccounts = 4
        this.maxWeight = 8850
    }

    disable3Speak() {
        this.threespeak = false
        this.maxAccounts = 8
        this.maxWeight = 10000
    }

    set3SpeakEncoder(encoder = '') {
        if (!this.threespeak) throw 'call enable3Speak() first'
        this.threespeakEncoder = encoder
    }

    updateBeneficiaries() {
        let beneficiaryTableList = document.getElementById('beneficiaryTableList'+this.getNetwork())
        let beneficiaryListHtml = ''
        for (let i = 0; i < this.accounts.length; i++) {
            beneficiaryListHtml += '<tr>'
            beneficiaryListHtml += '<td class="beneficiaryAccLabel">' + this.accounts[i].account + ' (' + this.accounts[i].weight / 100 + '%)</td>'
            beneficiaryListHtml += '<td><a class="roundedBtn beneficiaryDelBtn beneficiaryDelBtn' + this.getNetwork() + '" id="beneficiaryDelBtn'+this.getNetwork()+'_'+this.accounts[i].account+'">Remove</a></td>'
            beneficiaryListHtml += '</tr>'
        }
        beneficiaryTableList.innerHTML = beneficiaryListHtml
        document.getElementById('totalBeneficiariesLabel'+this.getNetwork()).innerText = 'Total '+this.getNetwork()+' beneficiaries: ' + this.getTotal() / 100 + '%'
    
        let allBeneficiaryDelBtnElems = document.querySelectorAll('a.beneficiaryDelBtn'+this.getNetwork())
    
        for (let i = 0; i < allBeneficiaryDelBtnElems.length; i++)
            document.getElementById(allBeneficiaryDelBtnElems[i].id).onclick = () =>
                this.removeAccount(allBeneficiaryDelBtnElems[i].id.split('_')[1])
    }

    sort() {
        return JSON.parse(JSON.stringify(this.accounts)).sort(this.beneficiarySorter)
    }

    beneficiarySorter (a,b) {
        let accA = a.account.toUpperCase()
        let accB = b.account.toUpperCase()
        let comp = 0
        if (accA > accB)
            comp = 1
        else if (accA < accB)
            comp = -1
        return comp
    }

    getSortedAccounts() {
        let result = JSON.parse(JSON.stringify(this.accounts))
        if (this.threespeak) {
            let required = Object.keys(THREESPEAK_FEES)
            if (this.threespeakEncoder && !required.includes(this.threespeakEncoder))
                required.push(this.threespeakEncoder)
            for (let i in result) {
                let idx = required.indexOf(result[i].account)
                if (idx > -1) {
                    let finalFee = THREESPEAK_FEES[required[idx]]
                    if (result[i].account === this.threespeakEncoder)
                        finalFee += THREESPEAK_ENCODER_FEE
                    result[i].weight = Math.max(result[i].weight, finalFee)
                    required.splice(idx,1)
                }
            }
            for (let i in required) {
                if (required[i] === this.threespeakEncoder)
                    result.push({
                        account: required[i],
                        weight: THREESPEAK_ENCODER_FEE + (THREESPEAK_FEES[required[i]] || 0)
                    })
                else
                    result.push({
                        account: required[i],
                        weight: THREESPEAK_FEES[required[i]]
                    })
            }
        }
        return result.sort(this.beneficiarySorter)
    }

    getNetwork() { return this.network }
    getList() { return this.accounts }
    getTotal() { return this.total }

    static describe() {
        let beneficiariesGrapheneList = []
        if (hiveDisplayUser) beneficiariesGrapheneList.push('HIVE')
        if (steemUser) beneficiariesGrapheneList.push('STEEM')
        if (blurtUser) beneficiariesGrapheneList.push('BLURT')
        let beneficiariesDescText = 'Add some accounts here to automatically receive a portion of your '+listWords(beneficiariesGrapheneList)+' post rewards.'
        if (avalonUser)
            beneficiariesDescText += ' Avalon beneficiaries are set in blockchain config such that @dtube receives 10% of DTUBE curation rewards.'
        if (isPlatformSelected['3Speak'])
            beneficiariesDescText += ' An 11.5% fee will be levied on HIVE post rewards for all 3Speak video uploads. This fee is imposed by 3Speak team, OneLoveIPFS does not have control over it.'
        return beneficiariesDescText
    }
}