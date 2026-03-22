// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CropInsurance {
    address public owner;
    address public backend;
    
    uint256 public constant SEASON_DURATION = 90 days;
    uint256 public constant BASE_PREMIUM_RATE = 100; // 1% in basis points (100 = 1%)
    
    // Tiered payout percentages
    uint256 public constant HIGH_DROUGHT_PAYOUT_PERCENT = 50; // 50% of coverage for high drought
    uint256 public constant SEVERE_DROUGHT_PAYOUT_PERCENT = 100; // 100% of coverage for severe drought
    
    struct InsurancePolicy {
        uint256 premiumPaid;
        uint256 coverageAmount;
        uint256 startDate;
        uint256 endDate;
        bool claimedThisSeason;
        bool active;
    }
    
    mapping(address => InsurancePolicy) public policies;
    mapping(address => uint256) public riskScores; // 80-150 (0.8x-1.5x premium multiplier)
    
    event InsurancePurchased(address indexed farmer, uint256 premium, uint256 coverage, uint256 endDate);
    event InsurancePayout(address indexed farmer, uint256 amount, string reason, string severity);
    event InsuranceRenewed(address indexed farmer, uint256 newEndDate);
    event RiskScoreUpdated(address indexed farmer, uint256 newScore);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }
    
    modifier onlyBackend() {
        require(msg.sender == backend, "Only backend can call");
        _;
    }
    
    constructor(address _backend) {
        owner = msg.sender;
        backend = _backend;
    }
    
    function buyInsurance(uint256 coverageAmount) external payable {
        require(!policies[msg.sender].active, "Already have active insurance");
        require(coverageAmount > 0, "Coverage amount must be positive");
        
        uint256 premium = calculatePremium(msg.sender, coverageAmount);
        
        // Check if sent HBAR matches premium
        require(msg.value == premium, "Incorrect premium amount");
        
        uint256 startDate = block.timestamp;
        uint256 endDate = startDate + SEASON_DURATION;
        
        policies[msg.sender] = InsurancePolicy({
            premiumPaid: premium,
            coverageAmount: coverageAmount,
            startDate: startDate,
            endDate: endDate,
            claimedThisSeason: false,
            active: true
        });
        
        emit InsurancePurchased(msg.sender, premium, coverageAmount, endDate);
    }
    
    function calculatePremium(address farmer, uint256 coverageAmount) public view returns (uint256) {
        uint256 riskScore = riskScores[farmer];
        if (riskScore == 0) riskScore = 100; // Default 1.0x multiplier
        
        // premium = coverageAmount * (BASE_PREMIUM_RATE / 10000) * (riskScore / 100)
        uint256 premium = (coverageAmount * BASE_PREMIUM_RATE * riskScore) / (100 * 100 * 100);
        return premium;
    }
    
    function processInsuranceClaim(
        address farmer,
        uint256 ndviScore,
        string memory vegetationHealth,
        string memory droughtRisk
    ) external onlyBackend {
        InsurancePolicy storage policy = policies[farmer];
        require(policy.active, "No active insurance");
        require(block.timestamp <= policy.endDate, "Insurance expired");
        require(!policy.claimedThisSeason, "Already claimed this season");
        
        // Check base conditions: poor vegetation and NDVI < 20%
        bool hasPoorVegetation = (ndviScore < 20 && 
                                keccak256(abi.encodePacked(vegetationHealth)) == keccak256(abi.encodePacked("poor")));
        
        if (hasPoorVegetation) {
            bytes32 droughtRiskHash = keccak256(abi.encodePacked(droughtRisk));
            bytes32 highHash = keccak256(abi.encodePacked("high"));
            bytes32 severeHash = keccak256(abi.encodePacked("severe"));
            
            uint256 payoutAmount = 0;
            string memory severityLevel = "";
            
            // Tiered payout system
            if (droughtRiskHash == highHash) {
                // 50% payout for high drought risk
                payoutAmount = (policy.coverageAmount * HIGH_DROUGHT_PAYOUT_PERCENT) / 100;
                severityLevel = "high";
            } 
            else if (droughtRiskHash == severeHash) {
                // 100% payout for severe drought risk
                payoutAmount = policy.coverageAmount;
                severityLevel = "severe";
            }
            
            // Process payout if eligible
            if (payoutAmount > 0) {
                policy.claimedThisSeason = true;
                
                // Send HBAR payout directly to farmer
                payable(farmer).transfer(payoutAmount);
                
                emit InsurancePayout(farmer, payoutAmount, "drought_poor_vegetation", severityLevel);
            }
        }
    }
    
    function renewInsurance() external payable {
        InsurancePolicy storage policy = policies[msg.sender];
        require(policy.active, "No active insurance");
        require(block.timestamp > policy.endDate, "Insurance not expired yet");
        
        uint256 newPremium = calculatePremium(msg.sender, policy.coverageAmount);
        
        // Check if sent HBAR matches new premium
        require(msg.value == newPremium, "Incorrect premium amount");
        
        policy.premiumPaid += newPremium;
        policy.endDate += SEASON_DURATION;
        policy.claimedThisSeason = false;
        
        emit InsuranceRenewed(msg.sender, policy.endDate);
    }
    
    // Admin functions
    function setRiskScore(address farmer, uint256 riskScore) external onlyOwner {
        require(riskScore >= 80 && riskScore <= 150, "Risk score must be between 80-150");
        riskScores[farmer] = riskScore;
        emit RiskScoreUpdated(farmer, riskScore);
    }
    
    function setBackend(address newBackend) external onlyOwner {
        require(newBackend != address(0), "Invalid backend address");
        backend = newBackend;
    }
    
    function withdrawPremiums(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient contract balance");
        payable(owner).transfer(amount);
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // View functions
    function getPolicy(address farmer) external view returns (
        uint256 premiumPaid,
        uint256 coverageAmount,
        uint256 startDate,
        uint256 endDate,
        bool claimedThisSeason,
        bool active
    ) {
        InsurancePolicy memory policy = policies[farmer];
        return (
            policy.premiumPaid,
            policy.coverageAmount,
            policy.startDate,
            policy.endDate,
            policy.claimedThisSeason,
            policy.active
        );
    }
    
    function canClaim(address farmer) external view returns (bool) {
        InsurancePolicy memory policy = policies[farmer];
        return (policy.active && 
                block.timestamp <= policy.endDate && 
                !policy.claimedThisSeason);
    }
    
    // View function to check potential payout amount
    function getPayoutAmount(address farmer, string memory droughtRisk) external view returns (uint256) {
        InsurancePolicy memory policy = policies[farmer];
        bytes32 droughtRiskHash = keccak256(abi.encodePacked(droughtRisk));
        bytes32 highHash = keccak256(abi.encodePacked("high"));
        bytes32 severeHash = keccak256(abi.encodePacked("severe"));
        
        if (droughtRiskHash == highHash) {
            return (policy.coverageAmount * HIGH_DROUGHT_PAYOUT_PERCENT) / 100;
        } 
        else if (droughtRiskHash == severeHash) {
            return policy.coverageAmount;
        }
        return 0;
    }
    
    // Fallback function to receive HBAR
    receive() external payable {}
}