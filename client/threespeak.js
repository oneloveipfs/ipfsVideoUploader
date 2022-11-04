// Mandatory fees imposed by 3Speak team
const THREESPEAK_FEES = {
    'spk.beneficiary': 850,
    threespeakleader: 100,
    sagarkothari88: 100
}

const THREESPEAK_ENCODER_FEE = 100

function spkNoticeCheckboxChanged() {
    document.getElementById('spkNoticeContinueBtn').disabled = !document.getElementById('spkUploadAgreeNotice').checked || !document.getElementById('spkUploadAgreeTerms').checked
}