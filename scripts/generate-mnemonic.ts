import { generateMnemonic } from 'viem/accounts';
import { wordlist } from '@scure/bip39/wordlists/english';

const mnemonic = generateMnemonic(wordlist);
console.log('Your Farcaster dev mnemonic:', mnemonic); 