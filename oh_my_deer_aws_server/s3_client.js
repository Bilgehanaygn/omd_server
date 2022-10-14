const S3 = require("aws-sdk/clients/s3");
const Jimp = require("jimp");
const axios = require('axios');
const ReturnType = require('./models/return_type');
require('dotenv').config();

const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');

const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_KEY

class S3Client{
    // s3 = new S3({
    //     region,
    //     accessKeyId,
    //     secretAccessKey
    // });
    
    // bucketName = bucketName;


    constructor(){
        if(S3Client.instance == null){
            //initialize here
            this.s3 = new S3({
                region,
                accessKeyId,
                secretAccessKey
            });

            this.bucketName = bucketName;

            S3Client.instance = this;
        }
        return S3Client.instance;
    }

    async createArt(requestedTraits){
        //imageNames is a list of image in order
        console.log(requestedTraits);
        if(!requestedTraits.outfit && !requestedTraits.cap && !requestedTraits.accessory){
            throw('No requested trait can be found');
        }
    
        //load base image
        const baseImage = await Jimp.read(requestedTraits.base);
    
        if(requestedTraits.accessory){
            let imageToAdd = await Jimp.read(__dirname+`/assets/Accessory/${requestedTraits.accessory}.png`);
            baseImage.composite(imageToAdd, 0, 0, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
            });
        }

        if(requestedTraits.outfit){
            let imageToAdd = await Jimp.read(__dirname+`/assets/Outfit/${requestedTraits.outfit}.png`);
            baseImage.composite(imageToAdd, 0, 0, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
            });
        }

        if(requestedTraits.cap){
            let imageToAdd = await Jimp.read(__dirname+`/assets/Cap/${requestedTraits.cap}.png`);
            baseImage.composite(imageToAdd, 0, 0, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1
            });
        }
    
    
        let imageBuffer;
    
        baseImage.getBuffer(Jimp.MIME_PNG,(err,buffer)=>{
            imageBuffer=buffer;
        });
    
    
        return imageBuffer;
    };


    async createMetadata (oldMetadata, newImageUri,requestedAccessory, requestedOutfit, requestedCap){    

        //traitType level
        let levelTraitObject = oldMetadata.attributes.find(element=>element.trait_type==="Level");
    
        if(!levelTraitObject){
            levelTraitObject = {trait_type:'Level', value:'Level 0'};
            oldMetadata.attributes.push(levelTraitObject);
        }
    
        let level = parseInt(levelTraitObject.value.split(' ')[1]);

        //check if it does not already have accessory trait and if not:
        if(requestedAccessory){
            
            //increase level
            level = level + 2;

            //include accessory trait
            oldMetadata.attributes.push({trait_type:"Accessory", value:requestedAccessory})
        }

        if(requestedOutfit){
            //increase level
            level = level + 2;

            //include outfit trait
            oldMetadata.attributes.push({trait_type:"Outfit", value:requestedOutfit});
        }

        if(requestedCap){
            
            //increase level
            level = level + 2;

            //include cap trait
            oldMetadata.attributes.push({trait_type:"Cap", value:requestedCap});
        }

    
        //now level is updated, include it in metadata
        levelTraitObject.value = `Level ${level}`;

        //update image Uri to the new iamge uri
        oldMetadata.image = newImageUri;
    
        //return stringified newMetadata
        return JSON.stringify(oldMetadata);

    }

    uploadFile(bufferData, fileName, fileType){

        let uploadParams = {
            Bucket: this.bucketName,
            Body: bufferData,
            Key: fileName,
            ContentType: fileType
        }
        
        return this.s3.putObject(uploadParams).promise();

    }

    isRequestedTraitsSafe(oldMetadata, requestedTraits){
        let safe = true;
        if(requestedTraits.requestedAccessory && oldMetadata.attributes.find(element=>{element.trait_type==="Accessory"})){
            safe=false;
        }
        if(requestedTraits.requestedOutfit && oldMetadata.attributes.find(element=>{element.trait_type==="Outfit"})){
            safe=false;
        }
        if(requestedTraits.requestedCap && oldMetadata.attributes.find(element=>{element.trait_type==="Cap"})){
            safe=false;
        }
        return safe;
    }


    async execute(oldMetadata, requestedTraits){
        //requestedTraits is in format: {cap:'Angel', outfit:'Galactic'}
        try{

            if(!this.isRequestedTraitsSafe(oldMetadata, requestedTraits)){
                return new ReturnType(false, 'Cannot have multiple updates on the same trait.');
            }
        
            let imageBuffer = await this.createArt(requestedTraits);

            //upload art to s3 bucket
            await this.uploadFile(imageBuffer, `${oldMetadata.name.split('#')[1]}.png`, 'image/png');

        
            let metadataBuffer = await this.createMetadata(
                oldMetadata,
                `https://ohmydeerbucket.s3.amazonaws.com/${oldMetadata.name.split('#')[1]}.png`,
                requestedTraits.accessory, 
                requestedTraits.outfit,
                requestedTraits.cap
            );
        
            //upload metadata to s3 bucket
            
            await this.uploadFile(metadataBuffer, `${oldMetadata.name.split('#')[1]}.json`, 'application/json');

            return new ReturnType(true, `https://ohmydeerbucket.s3.amazonaws.com/${oldMetadata.name.split('#')[1]}.json`);
        }
        catch(err){
            console.log(err);
            return new ReturnType(false, 'serverSideError');
        }
        
    }


}


const s3Client = new S3Client();
Object.freeze(s3Client);
module.exports = s3Client;