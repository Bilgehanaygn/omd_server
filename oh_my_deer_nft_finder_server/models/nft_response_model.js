class NftResponseBuilder {
    constructor(){}

    addTokenMintStr(tokenMintStr){
        this.tokenMintStr = tokenMintStr;
        return this;
    }

    addMetadataIdStr(metadataIdStr){
        this.metadataIdStr = metadataIdStr;
        return this;
    }

    addOldUri(oldUri){
        this.oldUri = oldUri;
        return this;
    }

    addNftImageUri(nftImageUri){
        this.nftImageUri = nftImageUri;
        return this;
    }

    addNftName(nftName){
        this.nftName = nftName;
        return this;
    }

    print(){
        console.log(this);
    }


}

module.exports = NftResponseBuilder;