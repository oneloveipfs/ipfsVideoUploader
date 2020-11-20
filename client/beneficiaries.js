// Hive, Steem and Blurt beneficiaries
class Beneficiaries {
    constructor(network) {
        this.accounts = []
        this.total = 0
        this.network = network
    }

    addAccount(account,weight) {
        if (!account || !weight) throw 'No account or weight?'
        if (this.accounts.length == 8) throw 'Maximum number of beneficiary accounts is 8.'
        if (account == username) throw 'Cannot set beneficiary to own account.'
        if (weight <= 0) throw 'Beneficiary percentage must be more than 0.'
        if (this.total + weight > 10000) throw 'Cannot set beneficiaries totalling more than 100%.'
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

    getNetwork() { return this.network }
    getList() { return this.accounts }
    getTotal() { return this.total }
}