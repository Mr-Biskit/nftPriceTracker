const { Alchemy, Network, Contract } = require("alchemy-sdk");
const { ethers } = require("ethers");
require("dotenv").config();
const axios = require("axios");
const retry = require("async-retry");
const { openSeaHandler } = require("./txHandlers/openSeaHandler");
const {
  TRANSFER_EVENT_HASH,
  MARKET_SALE_EVENT_HASH,
} = require("./constants/log_event_hash");
const marketPlaceAbi = require("./constants/marketplace_abi.json");
const { marketplace } = require("./constants/marketplace.js");
const { tokenTypes } = require("./constants/tokens.js");

const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API,
  network: Network.ETH_MAINNET,
});

async function parseTxReceipt(txHash) {
  const interface = new ethers.utils.Interface(marketPlaceAbi);

  const receipt = await retry(
    async () => {
      const rec = await alchemy.core.getTransactionReceipt(txHash);

      if (rec == null) {
        throw new Error("receipt not found, try again");
      }

      return rec;
    },
    {
      retries: 5,
    }
  );
  const targetMarket = receipt.to.toLowerCase();

  // Check if the target market is in the marketplace list
  if (!(targetMarket in marketplace)) {
    return;
  }

  // Check the type of token being transfered for the NFT
  let tokenType = {
    name: "ETH",
    decimals: 18,
    threshold: 1,
  };

  let tokenIDs = [];
  let totalPrice = [];
  let fromAddress = [];
  let toAddress = [];

  for (let log of receipt.logs) {
    const logAddress = log.address.toLowerCase();
    if (logAddress in tokenTypes) {
      tokenType = tokenTypes[logAddress];
    }

    // Check if the log is a transfer event in order to get tokenId, fromAddress, and toAddress
    if (log.data == "0x" && log.topics[0] == TRANSFER_EVENT_HASH) {
      const tokenIdBigNumber = ethers.BigNumber.from(log.topics[3].toString());
      const tokenId = tokenIdBigNumber.toNumber();
      const from = ethers.utils.hexValue(log.topics[1].toString());
      const to = ethers.utils.hexValue(log.topics[2].toString());
      tokenIDs.push(tokenId);
      fromAddress.push(from);
      toAddress.push(to);
    }

    // Check if the log is a market sale event in order to get the totalPrice
    if (
      logAddress == targetMarket &&
      MARKET_SALE_EVENT_HASH.includes(log.topics[0])
    ) {
      const logData = interface.parseLog({
        data: log.data,
        topics: [...log.topics],
      })?.args;

      // Check if the target market is OpenSea
      if (targetMarket === "0x00000000006c3852cbef3e08e8df289169ede581") {
        const price = openSeaHandler(logData);
        totalPrice.push(price);
      }
      // Check if the target market is Blur
      else if (targetMarket === "0x000000000000ad05ccc4f10045630fb830b95127") {
        const price = Number(
          ethers.utils.formatUnits(logData.sell.price, tokenType.decimals)
        );
        totalPrice.push(price);
      }
      // Check if the target market is X2Y2
      else if (targetMarket === "0x74312363e45dcaba76c59ec49a7aa8a65a67eed3") {
        const price = Number(
          ethers.utils.formatUnits(logData.amount, tokenType.decimals)
        );
        totalPrice.push(price);
      }
      // Check if the target market is LooksRare
      else if (targetMarket === "0x59728544b08ab483533076417fbbb2fd0b17ce3a") {
        const price = Number(
          ethers.utils.formatUnits(logData.price, tokenType.decimals)
        );
        totalPrice.push(price);
      }
    }
  }

  // Create an array in case of a transaction with multiple NFT transfers
  const nftArray = [];
  for (let i = 0; i < tokenIDs.length; i++) {
    const nftObject = {
      tokenId: tokenIDs[i],
      from: fromAddress[i],
      to: toAddress[i],
      totalPrice: `${totalPrice[i]} ${tokenType.name}`,
      marketPlace: marketplace[targetMarket].name,
    };
    nftArray.push(nftObject);
  }

  console.log(
    "====================== Transaction Detail ======================"
  );
  console.log(nftArray);
}

async function fetchNFTAbi() {
  const endpoint = `https://api.etherscan.io/api?module=contract&action=getabi&address=${process.env.CONTRACT_ADDRESS}&apikey=${process.env.ETHERSCAN_API}`;
  try {
    const response = await axios.get(endpoint);
    return response.data.result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

let lastTx;
async function trackWebSocket() {
  const provider = await alchemy.config.getWebSocketProvider();
  const abi = await fetchNFTAbi();
  const contract = new Contract(process.env.CONTRACT_ADDRESS, abi, provider);
  contract.on("Transfer", async (to, from, tokenId, event) => {
    console.log(
      "====================== Transfer Event Detected ======================"
    );
    let txHash = await event.transactionHash;
    if (txHash == lastTx) {
      return;
    }
    lastTx = txHash;

    if (txHash == null) {
      console.log("txHash is null");

      return;
    }

    await parseTxReceipt(txHash);
  });
}

trackWebSocket();
