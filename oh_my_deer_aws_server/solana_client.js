const { Transaction, PublicKey, Connection, Keypair } = require("@solana/web3.js");
const { createTransferInstruction, getAssociatedTokenAddress } = require("@solana/spl-token");
const {createUpdateMetadataAccountV2Instruction} = require('@metaplex-foundation/mpl-token-metadata');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');
const ReturnType = require("./models/return_type");
const { TOKEN_PROGRAM_ID } = require("@project-serum/anchor/dist/cjs/utils/token");
const fs = require('fs')

function solanaClientFactory(){

    const connection = new Connection('https://sly-palpable-pool.solana-mainnet.discover.quiknode.pro/e5c25e767841952052a768c25ce779d521caac98/')
    const deerTokenPubkey = new PublicKey('74wQpuzNhGx9XrrVWYHSZCDoEEuY4TkW7oQ6dQwEiMr2');
    const ourDeerTokenAta = new PublicKey('GWAwAyAzMecQXfgCVVYjNB3uDkAdBgFomHx2Bf9ottoA');
    
    const getTransferInstruction = async function (senderPubkey, amount){
        //find sender ATA by its publickey
        let senderAta = await getAssociatedTokenAddress(deerTokenPubkey, senderPubkey);
        
        const transferInstruction = createTransferInstruction(
            senderAta,//3bzk
            ourDeerTokenAta,
            senderPubkey,
            amount,
            // undefined,
            // TOKEN_PROGRAM_ID
        )
    
        return transferInstruction;
    }



    const getMetadataUpdateInstruction = async function(nftNameFromOldUri, metadataId, newUri){
        const updated_data = {
            name: nftNameFromOldUri,
            symbol: "DEER",
            uri: newUri,
            sellerFeeBasisPoints: 1000,
            creators: [
                {
                  address: new PublicKey("CwdXBwZXW7VmYRTZ7o3dWhnfhMFXQiUdZNNHSkyywVN6"),
                  verified: 1,
                  share: 0
                },
                {
                  address: new PublicKey("4cZKxYGm8k6aZo4Ytp2PcPvhfJNynxBEKCn2LJkZacut"),
                  verified: 0,
                  share: 100
                }
            ],
            collection:null,
            uses: null
        };
    
    
        const accounts = {
            metadata: new PublicKey(metadataId),
            updateAuthority: new PublicKey('2Qg8Q6FznQKoQm1NPZUQ6RnHJtMHuWwNQ33b1Fqy1JoY'),
        }


        const args = {
            updateMetadataAccountArgsV2: {
              data: updated_data,
              updateAuthority: new PublicKey('2Qg8Q6FznQKoQm1NPZUQ6RnHJtMHuWwNQ33b1Fqy1JoY'),
              primarySaleHappened: true,
              isMutable: true,
            }
        }
        
        const updateMetadataAccountInstruction = createUpdateMetadataAccountV2Instruction(
            accounts,
            args,
            // new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
        );
    
        return updateMetadataAccountInstruction;
    }

    const getOwnerPubkeyStrByMint = async function(tokenMintStr){
        const tokenMintPubkey = new PublicKey(tokenMintStr);
        const largestAccounts = await connection.getTokenLargestAccounts(tokenMintPubkey);
        const largestAccountInfo = await connection.getParsedAccountInfo(
            largestAccounts.value[0].address  //first element is the largest account, assumed with 1 
        );
        return largestAccountInfo.value.data.parsed.info.owner;
    }

    const checkOwnerMatches = async function(senderPubkeyStr, nftMintStr){
        try{
            let tokenOwnerStr = await getOwnerPubkeyStrByMint(nftMintStr);

            if(tokenOwnerStr===senderPubkeyStr){
                return new ReturnType(true, 'success');
            }
            return new ReturnType(false,'Owner of the NFT does not match the wallet connected to the site!');
        }
        catch(err){
            return new ReturnType(false, 'Server side error in checkOwnerMatches function');
        }

    }

    const createKeypair = async ()=>{
        const seed = await bip39.mnemonicToSeed('execute shop meadow also fall three increase portion woman measure plate genuine');
        const seedBuffer = Buffer.from(seed).toString('hex');
        const path44Change = `m/44'/501'/3'/0'`;
        const derivedSeed = derivePath(path44Change, seedBuffer).key;
        const keypair = Keypair.fromSeed(derivedSeed);
        
        return keypair;
    };

    const signTransactionWithOurKeypair = async (transaction) => {
        const keypair = await createKeypair();
        transaction.partialSign(keypair);

        return transaction;
    }

    const constructSignedSerializedTransaction = async function(senderPubkeyStr, amount, nftNameFromOldUri, metadataId, newUri){
        let senderPubkey = new PublicKey(senderPubkeyStr);
        const transferInstruction = await getTransferInstruction(senderPubkey, amount);
        const updateInstruction = await getMetadataUpdateInstruction(nftNameFromOldUri, metadataId, newUri);
        const transaction = new Transaction();
        transaction.add(transferInstruction);
        transaction.add(updateInstruction);

        let {blockhash} = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = senderPubkey;

        let transactionSigned = await signTransactionWithOurKeypair(transaction);
        let txSignedSerialized = transactionSigned.serialize({requireAllSignatures:false, verifySignatures:false});

        return txSignedSerialized;
    }


    const createTransaction = async function(senderPubkeyStr, amount, nftNameFromOldUri, metadataId, newUri){

        try{
            
            let txSignedSerialized = await constructSignedSerializedTransaction(senderPubkeyStr, amount, nftNameFromOldUri, metadataId, newUri);
            
    
            //serialize and respond
        
            return new ReturnType(true, txSignedSerialized);
        }
        catch(err){
            console.log(err);
            return new ReturnType(false, err);
        }


    }

    
    return (
        module.solanaClient ?
        module.solanaClient
        :
        {
            execute: createTransaction,
            checkOwnerMatches: checkOwnerMatches
        }
    );

}
//so both singleton and encapsulation(not the real encapsulation bot provided sth similar with javascript closures are implemented.)

module.solanaClient = new solanaClientFactory();
Object.freeze(module.solanaClient);
module.exports = module.solanaClient;
