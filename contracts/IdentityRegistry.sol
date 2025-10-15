// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract IdentityRegistry {
    address public admin;
    string public referenceImagesStorage;
    
    struct Identity {
        uint256 profileId;
        string hashedUrl;
        string ipfsCid;
        uint256 matchScore;
        uint256 timestamp;
    }
    
    mapping(address => Identity) public identities;
    mapping(uint256 => address[]) public profileToUsers;
    
    event IdentityRegistered(
        address indexed user,
        uint256 indexed profileId,
        string hashedUrl,
        string ipfsCid,
        uint256 matchScore
    );
    
    event ReferenceImagesUpdated(string newCid);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    function setReferenceImages(string memory cid) external onlyAdmin {
        referenceImagesStorage = cid;
        emit ReferenceImagesUpdated(cid);
    }
    
    function registerIdentity(
        uint256 profileId,
        string memory hashedUrl,
        string memory ipfsCid,
        uint256 matchScore
    ) external {
        require(profileId > 0 && profileId <= 5, "Invalid profile ID");
        require(matchScore >= 0 && matchScore <= 100, "Invalid match score");
        require(bytes(hashedUrl).length > 0, "Invalid hashed URL");
        require(bytes(ipfsCid).length > 0, "Invalid IPFS CID");
        
        // Remove from old profile mapping if exists
        if (identities[msg.sender].timestamp > 0) {
            uint256 oldProfileId = identities[msg.sender].profileId;
            _removeUserFromProfile(msg.sender, oldProfileId);
        }
        
        // Register new identity
        identities[msg.sender] = Identity({
            profileId: profileId,
            hashedUrl: hashedUrl,
            ipfsCid: ipfsCid,
            matchScore: matchScore,
            timestamp: block.timestamp
        });
        
        // Add to profile mapping
        profileToUsers[profileId].push(msg.sender);
        
        emit IdentityRegistered(msg.sender, profileId, hashedUrl, ipfsCid, matchScore);
    }
    
    function getIdentity(address user) external view returns (Identity memory) {
        return identities[user];
    }
    
    function getIdentityByProfile(uint256 profileId) external view returns (Identity memory) {
        address[] storage users = profileToUsers[profileId];
        if (users.length == 0) {
            return Identity({
                profileId: 0,
                hashedUrl: "",
                ipfsCid: "",
                matchScore: 0,
                timestamp: 0
            });
        }
        // Return the first user for this profile (can be modified for multiple users)
        return identities[users[0]];
    }
    
    function getUsersByProfile(uint256 profileId) external view returns (address[] memory) {
        return profileToUsers[profileId];
    }
    
    function getProfileUserCount(uint256 profileId) external view returns (uint256) {
        return profileToUsers[profileId].length;
    }
    
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        admin = newAdmin;
    }
    
    function _removeUserFromProfile(address user, uint256 profileId) internal {
        address[] storage users = profileToUsers[profileId];
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == user) {
                users[i] = users[users.length - 1];
                users.pop();
                break;
            }
        }
    }
}
