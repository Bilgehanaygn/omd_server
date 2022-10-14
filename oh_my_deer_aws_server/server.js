const s3Executer = require('./s3_client.js');
const solanaClient = require('./solana_client.js');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());



app.post("/api/update", async (req,res)=>{
    //req body should be in format {senderPubkeyStr:'',tokenMintStr:'', metedataIdStr: '', oldUri:'', requestedTraits:{cap:'Angel', Outfit:''}}

    
    //check if pubkey and owner of the nft to be updated matches through solana client
    let matches = await solanaClient.checkOwnerMatches(req.body.senderPubkeyStr, req.body.tokenMintStr);
    if(!matches.success){
        res.json(matches);
        return;
    }

    let {data} = await axios.get(req.body.oldUri);

    //create the art and store in AWS
    let awsSuccess = await s3Executer.execute(data, req.body.requestedTraits);

    //check if any problem for aws if so respond and return
    if(!awsSuccess.success){
        res.json(awsSuccess);
    }

    //if no any problem on aws then awsSuccess.message will have the new uri
    let newUri = awsSuccess.message;

    //use the same data in solanaClientExecuter
    //senderPubkeyStr, nftMint, amount, nftNameFromOldUri, metadataId, newUri
    let solanaSuccess = await solanaClient.execute(req.body.senderPubkeyStr, 5500, data.name, req.body.metadataIdStr, newUri);

    res.json(solanaSuccess);
    
})




const PORT = process.env.PORT || 5000;

app.listen(PORT, ()=>{
    console.log(`Listening on port ${PORT}`);
})



