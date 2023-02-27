const { ethers } = require("ethers");
require("dotenv").config();
const { tokenTypes } = require("../constants/tokens.js");

function _reducer(previous, current) {
  const token = tokenTypes[current.token.toLowerCase()];

  if (token !== undefined) {
    const result =
      previous +
      Number(ethers.utils.formatUnits(current.amount, token.decimals));

    return result;
  } else {
    return previous;
  }
}

function openSeaHandler(logData) {
  // Extract relevant data from logData
  const offer = logData.offer;
  const consideration = logData.consideration;

  // Check if nfts are on the offer side
  const offerSideNfts = offer.some(
    (item) =>
      item.token.toLowerCase() === process.env.CONTRACT_ADDRESS.toLowerCase()
  );

  // Calculate the total price based on whether nfts are on the offer side
  if (offerSideNfts) {
    // If nfts are on the offer side, then consideration is the total price
    const totalConsiderationAmount = consideration.reduce(_reducer, 0);
    return totalConsiderationAmount;
  } else {
    // If nfts are not on the offer side, then the offer is the total price
    const totalOfferAmount = offer.reduce(_reducer, 0);
    return totalOfferAmount;
  }
}

module.exports = {
  openSeaHandler: openSeaHandler,
};
