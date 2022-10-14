const nftClient = require('./nft_client.js');
const express = require('express');
const cors = require('cors');



const app = express();
app.use(cors());



app.get('/api/findNftsByOwner', async (req,res)=>{
    //metadata tokenmint uri png

    let nftResponses = await nftClient.detectDeerNfts(req.query.wallet);
    res.json(nftResponses);
})






const PORT = process.env.PORT || 5000;

app.listen(PORT, ()=>{
    console.log(`Listening on port ${PORT}`);
})