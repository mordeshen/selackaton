// services/matching.js
const User = require('../models/User');
const Group = require('../models/Group');

class MatchingService {
  constructor() {
    this.weightFactors = {
      location: 0.3,
      interests: 0.25,
      personality: 0.35,
      age: 0.1
    };
  }

  async findBestGroupMatch(userId) {
    // מציאת התאמה מיטבית בין משתמש לקבוצה קיימת
    try {
      // שליפת פרופיל המשתמש
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // שליפת כל הקבוצות הקיימות
      const groups = await Group.find({});
      
      // חישוב ציון התאמה לכל קבוצה
      const matchScores = groups.map(group => {
        const score = this.calculateMatchScore(user, group);
        return { group, score };
      });
      
      // מיון לפי ציון התאמה (יורד)
      matchScores.sort((a, b) => b.score - a.score);
      
      // החזרת הקבוצה המתאימה ביותר, אם יש התאמה טובה מספיק
      if (matchScores.length > 0 && matchScores[0].score > 0.6) {
        return matchScores[0].group;
      }
      
      return null; // אין התאמה טובה מספיק, יש ליצור קבוצה חדשה
    } catch (error) {
      console.error('Error finding best group match:', error);
      throw error;
    }
  }
// services/matching.js (המשך)
calculateMatchScore(user, group) {
    // חישוב ציון התאמה בין משתמש לקבוצה
    let totalScore = 0;
    
    // 1. התאמת מיקום
    const locationScore = this.calculateLocationScore(
      user.profile.location, 
      group.members.map(m => m.userId.profile.location)
    );
    
    // 2. התאמת תחומי עניין
    const interestScore = this.calculateInterestOverlap(
      user.profile.interests,
      group.characteristics.get('interests') || []
    );
    
    // 3. התאמת מאפייני אישיות
    const personalityScore = this.calculatePersonalityMatch(
      user.profile.personalityTraits,
      group.characteristics.get('personalityTraits') || {}
    );
    
    // 4. התאמת גיל
    const ageScore = this.calculateAgeCompatibility(
      user.profile.age,
      group.members.map(m => m.userId.profile.age)
    );
    
    // חישוב ציון משוקלל
    totalScore = (
      this.weightFactors.location * locationScore +
      this.weightFactors.interests * interestScore +
      this.weightFactors.personality * personalityScore +
      this.weightFactors.age * ageScore
    );
    
    return totalScore;
  }

  calculateLocationScore(userLocation, groupLocations) {
    if (!userLocation || !userLocation.coordinates || groupLocations.length === 0) {
      return 0;
    }
    
    // חישוב מרחק ממוצע בק"מ בין המשתמש לחברי הקבוצה
    const validLocations = groupLocations.filter(loc => 
      loc && loc.coordinates && loc.coordinates.lat && loc.coordinates.long
    );
    
    if (validLocations.length === 0) {
      return 0;
    }
    
    const distances = validLocations.map(loc => 
      this.calculateDistance(
        userLocation.coordinates.lat,
        userLocation.coordinates.long,
        loc.coordinates.lat,
        loc.coordinates.long
      )
    );
    
    const averageDistance = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
    
    // המרת מרחק לציון (0-1), כאשר מרחק קטן יותר = ציון גבוה יותר
    // מרחק של 0 ק"מ = ציון 1, מרחק של 50 ק"מ ומעלה = ציון 0
    return Math.max(0, 1 - (averageDistance / 50));
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    // נוסחת Haversine לחישוב מרחק בין שתי נקודות על פני כדור הארץ
    const R = 6371; // רדיוס כדור הארץ בק"מ
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  calculateInterestOverlap(userInterests, groupInterests) {
    if (!userInterests || !groupInterests || userInterests.length === 0 || groupInterests.length === 0) {
      return 0;
    }
    
    // חישוב אחוז החפיפה בין תחומי העניין
    const intersection = userInterests.filter(interest => 
      groupInterests.includes(interest)
    );
    
    return intersection.length / Math.max(userInterests.length, 1);
  }

  calculatePersonalityMatch(userTraits, groupTraits) {
    if (!userTraits || !groupTraits) {
      return 0;
    }
    
    // חישוב מידת ההתאמה בין מאפייני אישיות (מרחק אוקלידי מנורמל)
    let sumSquaredDiff = 0;
    let traitCount = 0;
    
    for (const [trait, userValue] of Object.entries(userTraits)) {
      if (groupTraits[trait] !== undefined) {
        const groupValue = groupTraits[trait];
        sumSquaredDiff += Math.pow(userValue - groupValue, 2);
        traitCount++;
      }
    }
    
    if (traitCount === 0) {
      return 0;
    }
    
    // מרחק אוקלידי ממוצע בין 0 ל-1, כאשר 0 = התאמה מושלמת
    const avgDistance = Math.sqrt(sumSquaredDiff / traitCount);
    
    // המרה לציון התאמה בין 0 ל-1, כאשר 1 = התאמה מושלמת
    return Math.max(0, 1 - avgDistance);
  }

  calculateAgeCompatibility(userAge, groupAges) {
    if (!userAge || !groupAges || groupAges.length === 0) {
      return 0;
    }
    
    const validAges = groupAges.filter(age => age > 0);
    if (validAges.length === 0) {
      return 0;
    }
    
    // חישוב ממוצע וסטיית תקן של גילאים בקבוצה
    const avgAge = validAges.reduce((sum, age) => sum + age, 0) / validAges.length;
    
    const sumSquaredDiff = validAges.reduce((sum, age) => 
      sum + Math.pow(age - avgAge, 2), 0
    );
    
    const stdDev = Math.sqrt(sumSquaredDiff / validAges.length);
    
    // חישוב ציון התאמה לפי התפלגות נורמלית
    // ככל שהמשתמש קרוב יותר לממוצע הגילאים, כך הציון גבוה יותר
    const zScore = Math.abs((userAge - avgAge) / Math.max(stdDev, 1));
    
    // המרה לציון בין 0 ל-1, כאשר zScore של 0 = ציון 1, zScore של 2 ומעלה = ציון 0
    return Math.max(0, 1 - (zScore / 2));
  }

  async suggestNewGroup(user, similarUsers) {
    // יצירת הצעה לקבוצה חדשה על בסיס המשתמש ומשתמשים דומים
    try {
      // חילוץ מאפיינים משותפים למשתמשים
      const commonInterests = this.findCommonInterests(
        user.profile.interests,
        similarUsers.map(u => u.profile.interests)
      );
      
      // הגדרת מאפייני קבוצה מוצעת
      const groupType = this.determineGroupType(user, commonInterests);
      
      // יצירת שם לקבוצה
      const groupName = await this.generateGroupName(groupType, commonInterests);
      
      return {
        name: groupName,
        type: groupType,
        suggestedMembers: [user._id, ...similarUsers.map(u => u._id)],
        characteristics: {
          interests: commonInterests,
          location: user.profile.location.city
        }
      };
    } catch (error) {
      console.error('Error suggesting new group:', error);
      throw error;
    }
  }
}

module.exports = new MatchingService();