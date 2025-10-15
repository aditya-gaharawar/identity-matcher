# Identity Matcher

A blockchain-powered identity verification system that combines AI-powered facial recognition with decentralized storage.

## Features

- **AI-Powered Matching**: Uses Google Gemini Vision API for advanced facial recognition
- **Blockchain Security**: Identity records stored on smart contract
- **IPFS Storage**: Images stored via Lighthouse Web3 SDK
- **Supabase Database**: Metadata and audit trail
- **Web3 Integration**: Wallet connect with RainbowKit + Wagmi
- **Admin Panel**: Manage reference images and system settings

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Upload   │ ──▶│   Lighthouse    │ ──▶│     IPFS        │
│     Image       │    │   Upload API    │    │   Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Gemini      │ ◀──│   Reference     │ ◀──│    Supabase     │
│   AI Matching   │    │   Images DB     │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Verification  │ ──▶|  Smart Contract │ ──▶|   Filecoin      │
│    Result       │    |   Registry      │    |   Blockchain    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Setup Instructions

### 1. Environment Variables

Copy `.env.sample` to `.env.local` and configure:

```bash
# Wallet Connect
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id

# Lighthouse Web3
NEXT_PUBLIC_LIGHTHOUSE_API_KEY=your_lighthouse_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Google Gemini AI
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# Smart Contract
NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS=0x...
```

### 2. Supabase Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in the Supabase SQL editor
3. Copy your Supabase credentials to `.env.local`

### 3. Smart Contract Deployment

1. Deploy `contracts/IdentityRegistry.sol` to Filecoin Calibration:
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network calibration
```

2. Copy the deployed contract address to `.env.local`

### 4. Installation & Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## How It Works

### For Admins (Reference Image Management)
1. Connect wallet as admin
2. Switch to Filecoin Calibration network
3. Select Profile ID (1-5) for reference image
4. Upload reference images for each profile
5. Images are stored on IPFS and metadata in Supabase

### For Users (Identity Verification)
1. Connect wallet
2. Upload verification photo
3. System automatically:
   - Uploads image to IPFS
   - Compares against reference images using Gemini AI
   - Calculates match score and confidence
   - Stores verification attempt in database
4. If matched successfully, can register identity on blockchain
5. Identity is permanently recorded with cryptographic proof

### Security Features
- **Hashed URLs**: Image URLs are cryptographically hashed for privacy
- **Blockchain Immutability**: Identity records cannot be tampered with
- **Audit Trail**: All verification attempts logged in Supabase
- **Network Security**: Uses Filecoin Calibration testnet for development

## Smart Contract Functions

### Public Functions
- `getIdentity(address user)`: Get identity details for a user
- `getIdentityByProfile(uint256 profileId)`: Get identity by profile ID
- `getUsersByProfile(uint256 profileId)`: Get all users for a profile
- `getProfileUserCount(uint256 profileId)`: Count users per profile

### Admin Functions
- `setReferenceImages(string cid)`: Update reference images CID
- `transferAdmin(address newAdmin)`: Transfer admin rights

### User Functions
- `registerIdentity(profileId, hashedUrl, ipfsCid, matchScore)`: Register verified identity

## Database Schema

### reference_images
- Reference images for AI comparison
- Organized by profile_id (1-5)

### identity_records
- User verification attempts
- Match scores and status tracking

### verification_requests
- Audit trail of all requests
- Transaction hash tracking

## API Integration

### Google Gemini Vision
- Compares uploaded images with reference images
- Returns match score (0-100) and confidence level
- Provides detailed facial analysis

### Lighthouse Web3 SDK
- Decentralized image storage on IPFS
- Progress tracking for uploads
- Gateway access for image retrieval

## Development Notes

- Built with Next.js 15, TypeScript, and Tailwind CSS
- Web3 integration via RainbowKit + Wagmi
- Smart contracts use Ethers.js for interaction
- Responsive design with mobile support
- Real-time progress tracking for uploads

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please create an issue in the repository.