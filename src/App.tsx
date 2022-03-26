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
  const towallet=new Uint8Array([107,253,16,174,143,141,9,126,209,110,18,43,218,226,85,223,96,45,205,184,32,101,19,227,98,241,52,184,154,135,238,2,187,231,31,133,185,46,31,157,75,250,31,53,38,207,50,40,222,84,175,56,214,127,37,54,86,44,138,194,79,81,106,139])

  let sender;
  let receiver;
  const useLocalWallet=false;

  if(useLocalWallet)//use local wallet
  {
    sender = solanaWeb3.Keypair.fromSecretKey(fromwallet)
    receiver = solanaWeb3.Keypair.fromSecretKey(towallet)
  }
  else
  {
    sender = solanaWeb3.Keypair.fromSecretKey(fromwallet)
    receiver = provider
  }
  

  const sentamount = 0.01
  const recevieamount = 0.02

  const instructions=[];

  instructions.push(new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: receiver.publicKey,
      lamports: sentamount * 1000000000
    }),
  )); 

  instructions.push(new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: receiver.publicKey,
      toPubkey: sender.publicKey,
      lamports: recevieamount * 1000000000
    }),
  ));               
	
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

  const getTxSignatureLocal= async (signer, instruction1, blockhash) => 
  {
      addLog('getTxSignaturelocal in :'+signer.publicKey)
      const tx = new solanaWeb3.Transaction()
      tx.add(...instruction1)        
      tx.recentBlockhash = blockhash
      tx.feePayer = signer.publicKey     
      tx.sign(signer)
      //let signed = await signer.signTransaction(tx);
      //addLog('signed -: '+signed)

      tx.signatures.forEach((signature) => {
        addLog("signature local:"+signature.publicKey.toBase58());
      });
      const signature = tx.signatures.find(signature => signature.publicKey.toBase58() === signer.publicKey.toBase58())
      return signature
  }

  const getTxSignatureWeb= async (signer, instruction1, blockhash) => 
  {
      addLog('getTxSignatureWeb in :'+signer.publicKey)
      const tx = new solanaWeb3.Transaction()
      tx.add(...instruction1)        
      tx.recentBlockhash = blockhash
      tx.feePayer = signer.publicKey     
     
      let signed = await signer.signTransaction(tx);
      addLog('signed -: '+signed)

      tx.signatures.forEach((signature) => {
        addLog("signature Web:"+signature.publicKey.toBase58());
      });
      const signature = tx.signatures.find(signature => signature.publicKey.toBase58() === signer.publicKey.toBase58())
      return signature
  }


  
  

  const signMultipleTransactionMultiple = async () => {
    try 
    {    
      
      
      const blockhash = (await connection.getRecentBlockhash()).blockhash     
      addLog('from account :' + sender.publicKey);
      addLog('to account :' + receiver.publicKey);
      var receiverSignature;

      // getting signatures
   
      
      if(useLocalWallet){
          receiverSignature = await getTxSignatureLocal(receiver, instructions, blockhash)
      }
      else{
        receiverSignature = await getTxSignatureWeb(receiver, instructions, blockhash)
      }       

      const senderSignature = await getTxSignature(sender, instructions, blockhash)

      addLog('senderSignature :'+senderSignature.signature)
      addLog('receiverSignature :'+receiverSignature.signature)

      const tx = new solanaWeb3.Transaction().add(...instructions)
      tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
      tx.feePayer = receiver.publicKey

      tx.addSignature(senderSignature.publicKey, senderSignature.signature)
      tx.addSignature(receiverSignature.publicKey, receiverSignature.signature)

      addLog(`txhash: ${await connection.sendRawTransaction(tx.serialize())}`);

      // let signature1 = await connection.sendRawTransaction(transactiondata1.serialize());
      // addLog("Submitted transaction sol : " + signature1 + ", awaiting confirmation");
      // await connection.confirmTransaction(signature1);
      // addLog("Transaction sol: " + signature1 + " confirmed");       
      
      
      
      // let signature2 = await connection.sendRawTransaction(transactiondata2.serialize());
      // addLog("Submitted transaction nft : " + signature2 + ", awaiting confirmation");
      // await connection.confirmTransaction(signature2);
      // addLog("Transaction nft : " + signature2 + " confirmed");
      
    } catch (err) {
      console.warn(err);
      addLog("[error] signMultipleTransactions: " + JSON.stringify(err));
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
      <footer className="logs">
        {logs.map((log, i) => (
          <div className="log" key={i}>
            {log}
          </div>
        ))}
      </footer>
    </div>
  );
}

