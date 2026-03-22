// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ASAI.sol";

contract PestReward {
    ASAI public asaiToken;
    address public owner;
    address public backend; 
    
    mapping(address => uint256) public farmerRewards;
    mapping(string => bool) public processedPredictions;
    
    event PestDetected(address indexed farmer, string pestType, uint256 confidence, uint256 reward);
    event RewardClaimed(address indexed farmer, uint256 amount);
    event BackendUpdated(address indexed newBackend);
    event OwnershipTransferred(address indexed newOwner);
    
    modifier onlyBackend() {
        require(msg.sender == backend, "Only backend can call");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }
    
    constructor(address _asaiTokenAddress, address _backend) {
        asaiToken = ASAI(_asaiTokenAddress);
        owner = msg.sender;
        backend = _backend;
    }
    
    function recordPestDetection(
        address farmer,
        string memory predictionId,
        string memory pestType,
        uint256 confidence
    ) external onlyBackend {
        require(!processedPredictions[predictionId], "Prediction already processed");
        processedPredictions[predictionId] = true;
        
        // Calculate reward based on confidence
        uint256 rewardAmount;
        if (confidence >= 80) {
            rewardAmount = 100 * 10**8;  
        } else if (confidence >= 50) {
            rewardAmount = 50 * 10**8;   
        } else {
            rewardAmount = 20 * 10**8; 
        }
        
        // Add to farmer's rewards
        farmerRewards[farmer] += rewardAmount;
        
        emit PestDetected(farmer, pestType, confidence, rewardAmount);
    }
    
    function claimRewards() external {
        uint256 reward = farmerRewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        
        farmerRewards[msg.sender] = 0;
        
        // Mint ASAI tokens to farmer 
        asaiToken.mint(msg.sender, reward);
        
        emit RewardClaimed(msg.sender, reward);
    }
    
    //ADMIN FUNCTIONS
    
    function setBackend(address _backend) external onlyOwner {
        require(_backend != address(0), "Invalid backend address");
        backend = _backend;
        emit BackendUpdated(_backend);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
        emit OwnershipTransferred(newOwner);
    }
    
    // Emergency function to rescue any ERC20 tokens sent to contract
    function rescueTokens(address tokenAddress, uint256 amount) external onlyOwner {
        ASAI(tokenAddress).transfer(owner, amount);
    }
    
    //VIEW FUNCTIONS
    
    function getFarmerReward(address farmer) external view returns (uint256) {
        return farmerRewards[farmer];
    }
    
    function isPredictionProcessed(string memory predictionId) external view returns (bool) {
        return processedPredictions[predictionId];
    }
    
    function getContractInfo() external view returns (
        address tokenAddress,
        address contractOwner,
        address currentBackend,
        uint256 totalFarmersWithRewards
    ) {
        uint256 farmersCount;

        return (
            address(asaiToken),
            owner,
            backend,
            farmersCount
        );
    }
}