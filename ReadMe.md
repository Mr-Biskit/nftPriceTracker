## NFT Price Tracker

#### This server is set up in order to connect to the web socket of a certain NFT address and track when the Transfer event is fired. It currently on supports the mainstream marketplaces namely:

- OpenSea
- Blur
- X2Y2
- LooksRare

In order to run the application clone this reposistry.

```git
git clone https://github.com/Mr-Biskit/nftPriceTracker
```

Make sure you have the latest version of node installed and run the following in your terminal to install the dependecies:

```terminal
npm install
```

In order for the app to run correctly you will have to set up a .env account. You will need an alchemy API and a etherscan API key. You will also have to input the contract address for the NFT that you would like to track. Look at the .env.example for refrence.

Once you have the .env setup you can run: 

```node
node app.js
```
