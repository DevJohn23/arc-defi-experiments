'use client';

import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits, zeroAddress } from 'viem';
import { arcStreamABI } from '@/abis/arcStream';

// Contract Addresses
const ARC_STREAM_ADDRESS = '0xB6E49f0213c47C6f42F4f9792E7aAf6a604FD524';
const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

interface Stream {
  streamId: bigint;
  recipient: string;
  deposit: bigint;
  tokenAddress: string;
  startTime: bigint;
  duration: bigint;
}

export function StreamHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
    const [streams, setStreams] = useState<Stream[]>([]);
    const [isLoading, setIsLoading] = useState(true); // Add loading state

    useEffect(() => {
        if (!address || !publicClient) {
            return;
        }

        const fetchStreams = async () => {
            try {
                console.log("🌟 Fetching logs for sender:", address); // Add console log
                const logs = await publicClient.getLogs({
                    address: ARC_STREAM_ADDRESS,
                    event: {
                        "anonymous": false,
                        "inputs": [
                            {
                                "indexed": true,
                                "internalType": "uint256",
                                "name": "streamId",
                                "type": "uint256"
                            },
                            {
                                "indexed": true,
                                "internalType": "address",
                                "name": "sender",
                                "type": "address"
                            },
                            {
                                "indexed": true,
                                "internalType": "address",
                                "name": "recipient",
                                "type": "address"
                            },
                            {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "deposit",
                                "type": "uint256"
                            },
                            {
                                "indexed": false,
                                "internalType": "address",
                                "name": "tokenAddress",
                                "type": "address"
                            },
                            {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "startTime", // Added missing startTime
                                "type": "uint256"
                            },
                            {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "duration",
                                "type": "uint256"
                            }
                        ],
                        "name": "CreateStream",
                        "type": "event"
                    },
                    args: {
                        sender: address,
                    },
                    fromBlock: BigInt(0),
                    toBlock: 'latest',
                });

                console.log("📜 Logs found:", logs); // Add console log

                const parsedStreams = logs.map((log) => {
                    const { streamId, recipient, deposit, tokenAddress, startTime, duration } = (log as any).args;
                    return { streamId, recipient, deposit, tokenAddress, startTime, duration };
                });

                setStreams(parsedStreams.reverse());
            } catch (error) {
                console.error("❌ Error fetching logs:", error); // Add console log
            } finally {
                setIsLoading(false); // Set loading to false after fetch
            }
        };

        setIsLoading(true); // Set loading to true when starting fetch
        fetchStreams();
    }, [address, publicClient]);

    const getTokenInfo = (tokenAddress: string) => {
        if (tokenAddress.toLowerCase() === EURC_ADDRESS.toLowerCase()) {
            return { name: 'EURC', decimals: 6 };
        }
        if (tokenAddress.toLowerCase() === zeroAddress.toLowerCase()) {
            return { name: 'USDC', decimals: 18 };
        }
        return { name: 'Unknown', decimals: 18 };
    };

    const getStatus = (startTime: bigint, duration: bigint) => {
        const stopTime = startTime + duration;
        const now = BigInt(Math.floor(Date.now() / 1000));
        return now > stopTime ? 'Completed ✅' : 'Streaming ⏳';
    };

    if (!address) {
        return null;
    }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 mt-8">
      <h2 className="text-2xl font-semibold mb-4">Your Stream History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Recipient
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Token
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {isLoading ? ( // Check isLoading state
              <tr>
                <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-400">
                  Loading history...
                </td>
              </tr>
            ) : streams.length > 0 ? (
              streams.map((stream) => {
                const token = getTokenInfo(stream.tokenAddress);
                return (
                  <tr key={stream.streamId.toString()}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{stream.streamId.toString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 truncate max-w-xs">{stream.recipient}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatUnits(stream.deposit, token.decimals)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{token.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{getStatus(stream.startTime, stream.duration)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-400">
                  No streams found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
