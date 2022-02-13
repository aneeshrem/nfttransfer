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
      addLog("[disconnect] 👋");
    });
    provider.on("accountChanged", (publicKey: PublicKey | null) => {
      setPublicKey(publicKey);
      if (publicKey) {
        addLog("[accountChanged] Switched account to " + publicKey?.toBase58());
      } else {
        addLog("[accountChanged] Switched unknown account");
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
            addLog("[accountChanged] Failed to re-connect: " + err.message);
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
  const PLATFORM_SECRET_KEY = new Uint8Array([78,195,114,12,74,34,154,70,82,231,213,253,136,174,154,114,251,2,51,30,120,229,81,168,156,121,248,20,174,6,225,51,42,87,49,48,58,127,25,177,21,186,170,208,82,167,249,21,141,37,169,112,233,113,88,181,205,169,117,123,0,69,189,251]);
  var PLATFORM_WALLET = solanaWeb3.Keypair.fromSecretKey(PLATFORM_SECRET_KEY); 
  var tokenMintAddress = new solanaWeb3.PublicKey("4UhA7u8zxPYmt1YHgV7MnrxyZ51RDY8W2DWJiwSCtzV3");    
  var mintToken = new splToken.Token(connection,tokenMintAddress,splToken.TOKEN_PROGRAM_ID, PLATFORM_WALLET);
  var nftAmount=500;

  const createTransferTransactionSol= async () => {
    if (!provider.publicKey) return;
    let transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: PLATFORM_WALLET.publicKey,
        lamports: nftAmount,
      })
    );
    transaction.feePayer = provider.publicKey;
    addLog("Getting recent blockhash for sol transfer");
    const anyTransaction: any = transaction;
    anyTransaction.recentBlockhash = (
      await connection.getRecentBlockhash()
    ).blockhash;
    return transaction;
  };

  const createTransferTransactionNft = async () => {
    if (!provider.publicKey) return;

    var userTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(provider.publicKey)
    var platformTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(PLATFORM_WALLET.publicKey)

    var transaction = new solanaWeb3.Transaction()
    .add(
        splToken.Token.createTransferInstruction(
            splToken.TOKEN_PROGRAM_ID,
            platformTokenAccount.address,
            userTokenAccount.address,
            PLATFORM_WALLET.publicKey,
            [PLATFORM_WALLET],
            1
        )
    );   
    transaction.feePayer = provider.publicKey;
    addLog("Getting recent blockhash for nft transfer");
    const anyTransaction: any = transaction;
    anyTransaction.recentBlockhash = (
      await connection.getRecentBlockhash()
    ).blockhash;
    return transaction;
  }; 

  
  

  const signMultipleTransactionMultiple = async () => {
    try {
      const [transaction1, transaction2] = await Promise.all([
        createTransferTransactionSol(),
        createTransferTransactionNft(),
      ]);
      if (transaction1 && transaction2) {        
        const [transactiondata1,transactiondata2] = await provider.signAllTransactions([
          transaction1,
          transaction2,
        ]);

        let signature1 = await connection.sendRawTransaction(transactiondata1.serialize());
        addLog("Submitted transaction sol : " + signature1 + ", awaiting confirmation");
        await connection.confirmTransaction(signature1);
        addLog("Transaction sol: " + signature1 + " confirmed");       
       
        
        
        let signature2 = await connection.sendRawTransaction(transactiondata2.serialize());
        addLog("Submitted transaction nft : " + signature2 + ", awaiting confirmation");
        await connection.confirmTransaction(signature2);
        addLog("Transaction nft : " + signature2 + " confirmed");
        

        


      }
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

