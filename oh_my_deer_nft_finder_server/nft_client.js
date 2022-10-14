const hashlist = require('./hashlist.js');
const {Metaplex} = require('@metaplex-foundation/js');
const { PublicKey, Connection } = require('@solana/web3.js');
const NftResponseBuilder = require('./models/nft_response_model.js');
const axios = require('axios');

class NftClient {

    constructor(){
        this.connection = new Connection('https://sly-palpable-pool.solana-mainnet.discover.quiknode.pro/e5c25e767841952052a768c25ce779d521caac98/');
        this.metaplexNftClient = (new Metaplex(this.connection)).nfts();
    }


    async detectDeerNfts(ownerPubkeyStr){
        let nftResponses = [];
        let nftsByOwnerRes = await (this.metaplexNftClient.findAllByOwner({owner: new PublicKey(ownerPubkeyStr)})).run();
        for(let i = 0;i<nftsByOwnerRes.length;i++){

            //if it is not a deer nft skip
            if(!hashlist.includes(nftsByOwnerRes[i].mintAddress.toBase58())){
                continue;
            }

            //fetch nft metadata
            let {data} = await axios.get(nftsByOwnerRes[i].uri);
            
            //get image uri
            let nftImageUri = data.image;

            //getname
            let nftName = data.name;


            let nftResponse = new NftResponseBuilder()
            .addMetadataIdStr(nftsByOwnerRes[i].address.toBase58())
            .addTokenMintStr(nftsByOwnerRes[i].mintAddress.toBase58())
            .addOldUri(nftsByOwnerRes[i].uri)
            .addNftImageUri(nftImageUri)
            .addNftName(nftName);
            
            nftResponses.push(nftResponse);
        }

        return nftResponses;
    }

}

const nftClient = new NftClient();
Object.freeze(nftClient);
module.exports = nftClient;