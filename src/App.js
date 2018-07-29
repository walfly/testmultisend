import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import { Civil, EventStorageContract } from "@joincivil/core";
import { hashContent } from "@joincivil/utils";
import {mobydick} from "./gutenberg_moby_dick";
import { bufferToHex, toBuffer } from "ethereumjs-util";
import * as zlib from "zlib";
import * as Web3 from "web3";

const multiSendJson = [{"constant":false,"inputs":[{"name":"transactions","type":"bytes"}],"name":"multiSend","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}];


class App extends Component {
  constructor() {
    super();
    this.state = {
      account: "",
    };
  }
  async componentDidMount() {
    this.civil = new Civil();
    this.newsroom = await this.civil.newsroomAtUntrusted("0x948eae48bf32e350dc85fe8c9882c93f66f25820");
    this.newsroom.revisions().subscribe(item => console.log(item));
    this.web3 = new Web3(window.web3.currentProvider);
    console.log(this.web3);
    console.log(window.web3);
    this.civil.accountStream.subscribe(item => this.setState({account: item}));
    this.eventStorageContract = await EventStorageContract.singletonTrusted(this.civil.ethApi);
    const transactionWrapper = window.web3.eth.contract([{"constant":false,"inputs":[{"name":"operation","type":"uint8"},{"name":"to","type":"address"},{"name":"value","type":"uint256"},{"name":"data","type":"bytes"}],"name":"send","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]);
    this.tw = transactionWrapper.at(1);
    this.multisend = new this.web3.eth.Contract(multiSendJson, "0x2c155Fd04682979FD15c67FB65DfAb9345605761");
    console.log(this.multisend);
  }
  async sendMultiRevisions() {
    const { awaitReceipt } = await this.newsroom.publishURIAndHash("http://example.diamonds/1", hashContent(mobydick));
    const id = await awaitReceipt();
    const data1 = await this.newsroom.updateRevisionURIAndHashData(id, "http://example.diamonds/2", hashContent(mobydick + "1"));
    const data2 = await this.newsroom.updateRevisionURIAndHashData(id, "http://example.diamonds/3", hashContent(mobydick + "2"));
    const data3 = await this.newsroom.updateRevisionURIAndHashData(id, "http://example.diamonds/4", hashContent(mobydick + "3"));
    const data4 = await this.newsroom.updateRevisionURIAndHashData(id, "http://example.diamonds/5", hashContent(mobydick + "4"));

    // console.log(bufferToHex(toBuffer([1,"0x948eae48bf32e350dc85fe8c9882c93f66f25820" , 0, data1)));
    let nestedTransactionData = '0x' +
    this.tw.send.getData(1,"0x948eae48bf32e350dc85fe8c9882c93f66f25820" , 0, data1).substr(10) +
    this.tw.send.getData(1,"0x948eae48bf32e350dc85fe8c9882c93f66f25820" , 0, data2).substr(10) +
    this.tw.send.getData(1,"0x948eae48bf32e350dc85fe8c9882c93f66f25820" , 0, data3).substr(10) +
    this.tw.send.getData(1,"0x948eae48bf32e350dc85fe8c9882c93f66f25820" , 0, data4).substr(10);
    const transaction = this.multisend.methods.multiSend(nestedTransactionData);
    transaction.send({from: this.state.account}, async (err, txhash) => {
      console.log(err);
      console.log(txhash);
      await this.civil.ethApi.awaitReceipt(txhash);
    });

  }

  sendWithNote() {
    zlib.deflate(mobydick, async (err, buffer) => {
      console.log(buffer.byteLength);
      const transaction = await this.civil.ethApi.sendTransaction({from: this.state.account, to: "0xD04b9D1795A1D0E0638FaB4Ccd7DB0357e3CFBCb", value: 1000000000000000, data: bufferToHex(buffer)});
      console.log({transaction});
    });
  }
  sendEventStorage() {
    zlib.deflate(mobydick, async (err, buffer) => {
      const transaction = await this.eventStorageContract.store.sendTransactionAsync(bufferToHex(buffer));
      console.log({transaction});
    });
  }
  async recoverNote() {
    const receipt = await this.civil.ethApi.getTransaction("0x4c89d472e256babfbd8e03f13ce057a6477e19f8cda06f028d8d83af1b82514b");
    zlib.inflate(toBuffer(receipt.input), (err, buffer) => {
      if (!err) {
        console.log(buffer.toString());
      }
    })
  }
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
        <button onClick={() => this.sendWithNote()}>send as data</button>
        <button onClick={() => this.sendEventStorage()}>send as event</button>
        <button onClick={() => this.sendMultiRevisions()}>sendMultiRevisions</button>
      </div>
    );
  }
}

export default App;
