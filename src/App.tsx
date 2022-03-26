import { useState, useEffect, useCallback } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
  SystemProgram,
} from "@solana/web3.js";
import "./styles.css";
import * as solanaWeb3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';

type DisplayEncoding = "utf8" | "hex";
type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;  
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;  
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    const anyWindow: any = window;
    const provider = anyWindow.solana;
    if (provider.isPhantom) {
      return provider;
    }
  }
  window.open("https://phantom.app/", "_blank");
};

const NETWORK = clusterApiUrl("devnet");

export default function App() {
  const provider = getProvider();
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = useCallback(
    (log: string) => setLogs((logs) => [...logs, "> " + log]),
    []
  );
  const connection = new Connection(NETWORK);
  const [, setConnected] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  useEffect(() => {
    if (!provider) return;
    // try to eagerly connect
    provider.connect({ onlyIfTrusted: true }).catch((err) => {
      // fail silently
    });
    provider.on("connect", (publicKey: PublicKey) => {
      setPublicKey(publicKey);
      setConnected(true);
      addLog("[connect] " + publicKey?.toBase58());
    });
    provider.on("disconnect", () => {
      setPublicKey(null);
      setConnected(false);
      //addLog("[disconnect] 👋");
    });
    provider.on("accountChanged", (publicKey: PublicKey | null) => {
      setPublicKey(publicKey);
      if (publicKey) {
        addLog("[accountChanged] Switched account to " + publicKey?.toBase58());
      } else {
        //addLog("[accountChanged] Switched unknown account");
        // In this case, dapps could not to anything, or,
        // Only re-connecting to the new account if it is trusted
        // provider.connect({ onlyIfTrusted: true }).catch((err) => {
        //   // fail silently
        // });
        // Or, always trying to reconnect
        provider
          .connect()
          .then(() => addLog("[accountChanged] Reconnected successfully"))
          .catch((err) => {
            //addLog("[accountChanged] Failed to re-connect: " + err.message);
          });
      }
    });
    return () => {
      provider.disconnect();
    };
  }, [provider, addLog]);
  if (!provider) {
    return <h2>Could not find a provider</h2>;
  }
  const fromwallet = new Uint8Array([193,47,61,157,108,137,241,249,71,124,31,187,115,154,174,79,250,125,148,26,6,137,84,38,144,25,87,224,58,133,116,157,6,162,23,15,133,42,247,207,234,38,19,135,17,169,74,217,243,221,6,10,22,108,74,177,145,104,232,3,97,31,114,187]);  //address : stone
  let marketplaceWallet = solanaWeb3.Keypair.fromSecretKey(fromwallet)
  let receiver;
  receiver = provider  

  const sentamount = 0.01
  const recevieamount = 0.02

             
	
  const getTxSignature = async (signer, instruction1, blockhash) => 
  {
      addLog('getTxSignature in :'+signer.publicKey)
      const tx = new solanaWeb3.Transaction()
      tx.add(...instruction1)

      tx.recentBlockhash = blockhash
      tx.feePayer = receiver.publicKey
      tx.sign(signer)

      tx.signatures.forEach((signature) => {
        addLog("signature :"+signature.publicKey.toBase58());
      });
      const signature = tx.signatures.find(signature => signature.publicKey.toBase58() === signer.publicKey.toBase58())
      return signature
  }  
  

  const signMultipleTransactionMultiple = async () => {
    try 
    {    
     
      const instructions=[];

      var mintTokenAddress="4UhA7u8zxPYmt1YHgV7MnrxyZ51RDY8W2DWJiwSCtzV3";
      var mintTokenPub = new solanaWeb3.PublicKey(mintTokenAddress);
      var mintToken = new splToken.Token(connection,mintTokenPub,splToken.TOKEN_PROGRAM_ID, marketplaceWallet);
      var marketplaceTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo( marketplaceWallet.publicKey)
      var toTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(receiver.publicKey)

      instructions.push(new solanaWeb3.Transaction().add(
        splToken.Token.createTransferInstruction( 
            splToken.TOKEN_PROGRAM_ID,  
            marketplaceTokenAccount.address,                       
            toTokenAccount.address,
            marketplaceWallet.publicKey,
            [],
            1)
        )
    );
    
      instructions.push(new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey: receiver.publicKey,
          toPubkey: marketplaceWallet.publicKey,
          lamports: recevieamount * 1000000000
        }),
      ));  



      
      const blockhash = (await connection.getRecentBlockhash()).blockhash     
      addLog('from account :' + marketplaceWallet.publicKey);
      addLog('to account :' + receiver.publicKey);     

      const senderSignature = await getTxSignature(marketplaceWallet, instructions, blockhash)

      const tx = new solanaWeb3.Transaction().add(...instructions)
      tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
      tx.feePayer = receiver.publicKey

      tx.addSignature(senderSignature.publicKey, senderSignature.signature)

      let signed = await receiver.signTransaction(tx);
      addLog(`txhash: ${await connection.sendRawTransaction(tx.serialize())}`);  
      
    } catch (err) {
      console.warn(err);
      addLog("[error] signMultipleTransactions: " + JSON.stringify(err));
    }
  };

  
  const ClearText = async () => {
    try 
    {    
      const myNode = document.getElementById("divLog");
      myNode.innerHTML = '';      
      
      
    } catch (err) {
      console.warn(err);
      addLog("[error] ClearText: " + JSON.stringify(err));
    }
  };

 
  return (
    <div className="App">
      <main>
        <h1>Phantom Transfer</h1>
        {provider && publicKey ? (
          <>
            <div>
              <pre>Connected as</pre>
              <br />
              <pre>{publicKey.toBase58()}</pre>
              <br />
            </div>            
            <button onClick={() => signMultipleTransactionMultiple()}>
              Sign All Transactions (multiple){" "}
            </button>
            <button
              onClick={async () => {
                try {
                  await provider.disconnect();
                } catch (err) {
                  console.warn(err);
                  addLog("[error] disconnect: " + JSON.stringify(err));
                }
              }}
            >
              Disconnect
            </button>
            <button onClick={() => ClearText()}>
              Clear{" "}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={async () => {
                try {
                  await provider.connect();
                } catch (err) {
                  console.warn(err);
                  addLog("[error] connect: " + JSON.stringify(err));
                }
              }}
            >
              Connect to Phantom
            </button>
          </>
        )}
      </main>
      <footer id="divLog" className="logs">
        {logs.map((log, i) => (
          <div className="log" key={i}>
            {log}
          </div>
        ))}
      </footer>
    </div>
  );
}

