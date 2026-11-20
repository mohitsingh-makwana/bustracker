let userToken = null;
let memberToken = null;
let selectedTransportSystemId = null;

const tokenStore = {
    getUserToken() {
        return userToken;
    },

    setUserToken(token) {
        userToken = token;
    },

    getMemberToken() {
        return memberToken;
    },

    getSelectedTransportSystemId() {
        return selectedTransportSystemId;
    },

    setSelectedTransportSystemId(id) {
        selectedTransportSystemId = id == null ? null : String(id);
    },

    setMemberToken(token) {
        memberToken = token;
    },

    clearMemberToken() {
        memberToken = null;
    },

    clearAllTokens() {
        userToken = null;
        memberToken = null;
        selectedTransportSystemId = null;
    },
};

export default tokenStore;