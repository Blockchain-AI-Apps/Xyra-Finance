import React from 'react';

const REDDIT_POSTS = [
    {
        sub: "r/BitcoinBeginners",
        user: "u/RedditUser",
        title: "Can a recipient see my bitcoin wallet balance?",
        url: "https://www.reddit.com/r/BitcoinBeginners/comments/pkxav9/can_a_recipient_see_my_bitcoin_wallet_balance/",
        content: "I want to send money to a vendor, but I don't want them to see I have a large amount. Can they see my total balance once I send them a transaction?"
    },
    {
        sub: "r/Bitcoin",
        user: "u/RedditUser",
        title: "Wallet balance privacy",
        url: "https://www.reddit.com/r/Bitcoin/comments/1c0hbty/wallet_balance_privacy/",
        content: "Is there a way to hide my balance when sending crypto? It feels unsafe that anyone I transact with can see my entire transaction history."
    },
    {
        sub: "r/TREZOR",
        user: "u/RedditUser",
        title: "How to hide my balance from person I send my BTC to?",
        url: "https://www.reddit.com/r/TREZOR/comments/1gupivt/how_to_hide_my_balance_from_person_i_send_my_btc/",
        content: "Every time I pay someone from my Trezor, they can look up the address and see how much I hold. How do I prevent this?"
    },
    {
        sub: "r/Bitcoin",
        user: "u/RedditUser",
        title: "Can you see the total balance of a Wallet through the blockchain?",
        url: "https://www.reddit.com/r/Bitcoin/comments/pg4y4m/can_you_see_the_total_balance_of_a_wallet_through/",
        content: "If I give my address to receive a payment, can that person view my holding amount?"
    },
    {
        sub: "r/CryptoCurrency",
        user: "u/RedditUser",
        title: "Remember: your transactions are public and anyone can view them",
        url: "https://www.reddit.com/r/CryptoCurrency/comments/ou5uu9/remember_your_transactions_are_public_and_anyone/",
        content: "A lot of people forget that blockchains are public ledgers. If you reuse an address, your entire financial history is exposed."
    },
    {
        sub: "r/BitcoinBeginners",
        user: "u/RedditUser",
        title: "What can I exactly see in the blockchain public ledger?",
        url: "https://www.reddit.com/r/BitcoinBeginners/comments/12qhhdv/what_can_i_exactly_see_in_the_blockchain_public/",
        content: "Once someone has your wallet address, they can see the entire history. Is there any way around this?"
    },
    {
        sub: "r/ledgerwallet",
        user: "u/RedditUser",
        title: "Total balance check privacy",
        url: "https://www.reddit.com/r/ledgerwallet/comments/18t2vr5/total_balance_check/",
        content: "I just realized that anyone I interact with can see my total Ledger balance on block explorers. This is a huge privacy flaw."
    },
    {
        sub: "r/ledgerwallet",
        user: "u/RedditUser",
        title: "Understanding the privacy of the new address",
        url: "https://www.reddit.com/r/ledgerwallet/comments/1i5flff/understanding_the_privacy_of_the_new_address/",
        content: "Even with a new address for every transaction, change addresses still link my total balance if I'm not careful. How to achieve true privacy?"
    },
    {
        sub: "r/CryptoCurrency",
        user: "u/RedditUser",
        title: "How does Coinbase and other exchanges hide wallet balances?",
        url: "https://www.reddit.com/r/CryptoCurrency/comments/n0y61u/how_does_coinbase_and_other_exchanges_hide/",
        content: "Exchanges mix funds and hide balances, but as an individual, I don't have this luxury. How can I achieve the same privacy?"
    },
    {
        sub: "r/ledgerwallet",
        user: "u/RedditUser",
        title: "My BTC address searched on blockchain.com shows my balances",
        url: "https://www.reddit.com/r/ledgerwallet/comments/javmea/my_btc_address_searched_on_wwwblockchaincom_shows/",
        content: "I searched my address out of curiosity and was shocked to find my entire transaction history and balance are public."
    },
    {
        sub: "r/CryptoCurrency",
        user: "u/RedditUser",
        title: "Can someone find my personal information using my wallet?",
        url: "https://www.reddit.com/r/CryptoCurrency/comments/q9u89d/can_someone_find_my_personal_information_using_my/",
        content: "If my identity gets linked to my wallet through an exchange, someone can track my net worth and every payment I make."
    },
    {
        sub: "r/Bitcoin",
        user: "u/RedditUser",
        title: "If someone can link my identity to my wallet can they track my transactions?",
        url: "https://www.reddit.com/r/Bitcoin/comments/sbucap/if_someone_can_link_my_identity_to_my_wallet_can/",
        content: "It's terrifying that one leaked address could expose my total holdings to the world. Privacy on public chains is a myth."
    },
    {
        sub: "r/ethereum",
        user: "u/RedditUser",
        title: "Is it safe to show my ETH wallet address to others?",
        url: "https://www.reddit.com/r/ethereum/comments/q964li/is_it_safe_to_show_my_eth_wallet_address_to/",
        content: "I want to pay a contractor, but showing them my ETH address means they see my entire portfolio and every DApp I've used."
    },
    {
        sub: "r/ethereum",
        user: "u/RedditUser",
        title: "Any website can track you as an Ethereum user",
        url: "https://www.reddit.com/r/ethereum/comments/7rvyma/any_website_can_track_you_as_an_ethereum_user/",
        content: "Because Ethereum uses an account-based model, your entire balance is visible to any website you connect your wallet to."
    },
    {
        sub: "r/ethereum",
        user: "u/RedditUser",
        title: "Weird transactions mirroring my USDT transactions",
        url: "https://www.reddit.com/r/ethereum/comments/1935aw6/weird_transactions_mirroring_my_usdt_transactions/",
        content: "I noticed bots tracking and mirroring my transfers. Since the ledger is transparent, anyone can build a profile on my spending habits."
    },
    {
        sub: "r/ethereum",
        user: "u/RedditUser",
        title: "Ethereum network wallets or addresses tracked",
        url: "https://www.reddit.com/r/ethereum/comments/15cxoar/ethereum_network_wallets_or_addresses_tracked/",
        content: "Firms are deanonymizing wallets and selling the data. Financial privacy is non-existent unless you use ZK proofs."
    },
    {
        sub: "r/ethereum",
        user: "u/RedditUser",
        title: "You created a fresh ETH wallet for privacy cool",
        url: "https://www.reddit.com/r/ethereum/comments/1p77vmw/you_created_a_fresh_eth_wallet_for_privacy_cool/",
        content: "Funding a fresh wallet from your main wallet just links the two. True privacy requires breaking the link entirely."
    },
    {
        sub: "r/digitalnomad",
        user: "u/RedditUser",
        title: "Is anyone actually getting paid in stablecoins?",
        url: "https://www.reddit.com/r/digitalnomad/comments/1ncgl02/is_anyone_actually_getting_paid_in_stablecoins/",
        content: "Clients paying me in crypto can see every other client I've ever billed and exactly how much I make. It makes negotiating rates impossible."
    },
    {
        sub: "r/CryptoCurrency",
        user: "u/RedditUser",
        title: "The reality of getting paid in crypto",
        url: "https://www.reddit.com/r/CryptoCurrency/comments/1caz3og/the_reality_of_getting_paid_in_crypto/",
        content: "As a freelancer, getting paid in crypto is great for speed, but terrible for privacy. Every client knows my entire financial situation."
    },
    {
        sub: "r/CryptoIndia",
        user: "u/RedditUser",
        title: "Seeking advice on handling crypto payments as a freelancer",
        url: "https://www.reddit.com/r/CryptoIndia/comments/1ekyien/seeking_advice_on_handling_crypto_payments_as_a/",
        content: "Indian freelancers, how do you manage the privacy aspect of crypto payments? Clients can literally see your bank account balance."
    },
    {
        sub: "r/AskAGerman",
        user: "u/RedditUser",
        title: "Invoicing clients as a freelancer in crypto",
        url: "https://www.reddit.com/r/AskAGerman/comments/1oelt1h/invoicing_clients_as_a_freelancer_in_crypto/",
        content: "I want to accept crypto for my design work, but my transactions are public and anyone can figure out who my other clients are and my revenue. Any solutions?"
    },
    {
        sub: "r/opsec",
        user: "u/RedditUser",
        title: "Cryptocurrency privacy how can anyone find out",
        url: "https://www.reddit.com/r/opsec/comments/r3tmau/cryptocurrency_privacy_how_can_anyone_find_out/",
        content: "Given the transparent nature of most blockchains, what operational security measures are required to actually keep a balance private?"
    },
    {
        sub: "r/Bitcoin",
        user: "u/RedditUser",
        title: "Bitcoin donations on Twitch via Lightning ive",
        url: "https://www.reddit.com/r/Bitcoin/comments/npzu5w/bitcoin_donations_on_twitch_via_lightning_ive/",
        content: "I accepted Lightning donations, and viewers clustered my channels to figure out my total Bitcoin holdings."
    },
    {
        sub: "r/CryptoCurrency",
        user: "u/RedditUser",
        title: "Can your crypto wallet identity be found out",
        url: "https://www.reddit.com/r/CryptoCurrency/comments/xrh8s4/can_your_crypto_wallet_identity_be_found_out/",
        content: "Yes, and once it is, your entire financial life is an open book. We desperately need private-by-default payments."
    },
    {
        sub: "r/CryptoCurrency",
        user: "u/RedditUser",
        title: "How would we deal with privacy in a world where everyone uses crypto",
        url: "https://www.reddit.com/r/CryptoCurrency/comments/13kz72q/how_would_we_deal_with_privacy_in_a_world_where/",
        content: "If crypto becomes mainstream without privacy, every merchant you buy from will know your net worth. It's an Orwellian nightmare."
    },
    {
        sub: "ArXiv",
        user: "Academic",
        title: "Deanonymization and linkability in blockchains",
        url: "https://arxiv.org/abs/2201.06811",
        content: "These research papers explain that blockchain transactions are public and traceable, meaning wallet activity can be analyzed by anyone."
    },
    {
        sub: "ArXiv",
        user: "Academic",
        title: "Privacy in the Lightning Network",
        url: "https://arxiv.org/abs/2005.14051",
        content: "Research shows that even off-chain solutions like Lightning can leak significant information about user balances and payment flows."
    },
    {
        sub: "StackExchange",
        user: "u/ForumUser",
        title: "Can someone see my Bitcoin balance?",
        url: "https://bitcoin.stackexchange.com/questions/23979/can-someone-see-my-balance",
        content: "I just learned about block explorers. Does this mean any person I send funds to can see exactly how much I have left?"
    },
    {
        sub: "StackExchange",
        user: "u/ForumUser",
        title: "Is my Ethereum wallet balance public?",
        url: "https://ethereum.stackexchange.com/questions/25011/is-my-wallet-balance-public",
        content: "Yes, Ethereum's account model means an address holds everything in one place. Anyone with the address can see all ERC20 tokens and ETH."
    },
    {
        sub: "BitcoinTalk",
        user: "u/ForumUser",
        title: "Wallet privacy and balance visibility issues",
        url: "https://bitcointalk.org/index.php?topic=5468880",
        content: "We've been discussing this since 2011. Without base-layer privacy or zero-knowledge proofs, you simply don't have true financial privacy."
    }
];

export const RedditMarquee: React.FC = () => {
    return (
        <>
            <div className="relative flex overflow-hidden group w-[100vw] left-1/2 -translate-x-1/2" style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}>
                <div className="flex animate-[scroll_180s_linear_infinite] group-hover:[animation-play-state:paused] w-max gap-6 px-3">
                    {[...Array(2)].map((_, arrayIndex) => (
                        <div key={arrayIndex} className="flex gap-6">
                            {REDDIT_POSTS.map((post: any, i) => (
                                <div
                                    key={`post-${arrayIndex}-${i}`}
                                    className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 text-left w-[400px] shrink-0 relative overflow-hidden flex flex-col"
                                >
                                    <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-white/40 to-white/5" />
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                                                <span className="text-white font-bold text-xs">{post.sub.startsWith('r/') ? 'r/' : post.sub[0]}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-bold text-white text-sm">{post.sub}</span>
                                                </div>
                                                <span className="text-gray-500 text-xs">{post.user}</span>
                                            </div>
                                        </div>
                                        {post.url && (
                                            <a href={post.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0" title="Verify Original Post">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                            </a>
                                        )}
                                    </div>

                                    <div className="mt-4 space-y-2 flex-grow">
                                        <h3 className="font-bold text-lg leading-snug text-white">
                                            {post.url ? (
                                                <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 hover:underline transition-colors">
                                                    {post.title}
                                                </a>
                                            ) : (
                                                post.title
                                            )}
                                        </h3>
                                        {post.content && (
                                            <p className="text-sm leading-relaxed text-gray-400 font-light line-clamp-4 mt-2">
                                                {post.content}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Add required custom keyframes to index.css if not present, but using style tag here for self-containment */}
            <style>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </>
    );
};
