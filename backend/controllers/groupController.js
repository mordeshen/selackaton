// controllers/groupController.js
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const WhatsAppService = require('../services/whatsapp');
const AIService = require('../services/ai');
const MatchingService = require('../services/matching');

class GroupController {
  // קבלת כל הקבוצות
  async getGroups(req, res) {
    try {
      const groups = await Group.find();
      res.status(200).json({
        success: true,
        data: groups
      });
    } catch (error) {
      console.error('Error fetching groups:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch groups', 
        error: error.message 
      });
    }
  }

  // קבלת פרטי קבוצה
  async getGroupDetails(req, res) {
    try {
      const { id } = req.params;
      const group = await Group.findById(id);
      
      if (!group) {
        return res.status(404).json({ 
          success: false,
          message: 'Group not found' 
        });
      }
      
      res.status(200).json({
        success: true,
        data: group
      });
    } catch (error) {
      console.error('Error fetching group details:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch group details', 
        error: error.message 
      });
    }
  }

  // יצירת קבוצה חדשה
  async createGroup(req, res) {
    try {
      const { name, type, members, description } = req.body;
      
      // יצירת קבוצה ב-WhatsApp
      const phoneNumbers = await this.getPhoneNumbers(members);
      const whatsappGroup = await WhatsAppService.createGroup(name, phoneNumbers);
      
      // שמירת הקבוצה במסד הנתונים
      const newGroup = new Group({
        name,
        whatsappId: whatsappGroup.id,
        description,
        type,
        members: members.map(userId => ({
          userId,
          role: 'member'
        }))
      });
      
      await newGroup.save();
      
      // עדכון פרטי המשתמשים
      await User.updateMany(
        { _id: { $in: members } },
        { $push: { groups: newGroup._id } }
      );
      
      // שליחת הודעת פתיחה לקבוצה
      const welcomeMessage = await this.generateWelcomeMessage(newGroup);
      await WhatsAppService.sendGroupMessage(whatsappGroup.id, welcomeMessage);
      
      res.status(201).json({
        success: true,
        data: newGroup,
        message: 'Group created successfully'
      });
    } catch (error) {
      console.error('Error creating group:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to create group', 
        error: error.message 
      });
    }
  }

  // עדכון פרטי קבוצה
  async updateGroup(req, res) {
    try {
      const { id } = req.params;
      const { name, description, type } = req.body;
      
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }
      
      // עדכון פרטי הקבוצה
      const updateData = {};
      if (name) updateData.name = name;
      if (description) updateData.description = description;
      if (type) updateData.type = type;
      
      const updatedGroup = await Group.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );
      
      // אם שם הקבוצה השתנה, עדכון גם ב-WhatsApp
      if (name && name !== group.name) {
        await WhatsAppService.updateGroupName(group.whatsappId, name);
      }
      
      res.status(200).json({
        success: true,
        data: updatedGroup,
        message: 'Group updated successfully'
      });
    } catch (error) {
      console.error('Error updating group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update group',
        error: error.message
      });
    }
  }
  
  async getPhoneNumbers(userIds) {
    // המרת מזהי משתמשים למספרי טלפון
    const users = await User.find({ _id: { $in: userIds } }, 'phoneNumber');
    return users.map(user => user.phoneNumber);
  }
  
  async generateWelcomeMessage(group) {
    // יצירת הודעת פתיחה לקבוצה באמצעות AI
    const groupInfo = {
      name: group.name,
      description: group.description,
      type: group.type
    };
    
    const message = await AIService.generateResponse(
      'groupFacilitator',
      { groupInfo: JSON.stringify(groupInfo), chatHistory: '[]' },
      'generate_welcome_message'
    );
    
    return message;
  }
  // מחיקת קבוצה
  async deleteGroup(req, res) {
    try {
      const { id } = req.params;
      
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }
      
      // מחיקת הקבוצה מכל המשתמשים
      await User.updateMany(
        { 'groups': id },
        { $pull: { groups: id } }
      );
      
      // מחיקת כל ההודעות של הקבוצה
      await Message.deleteMany({ groupId: id });
      
      // מחיקת הקבוצה
      await Group.findByIdAndDelete(id);
      
      // ניסיון מחיקת הקבוצה מ-WhatsApp
      if (group.whatsappId) {
        try {
          await WhatsAppService.deleteGroup(group.whatsappId);
        } catch (whatsappError) {
          console.error('Failed to delete WhatsApp group:', whatsappError);
          // התרחשה שגיאה במחיקת הקבוצה מ-WhatsApp, אבל נמשיך באופן תקין
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Group deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete group',
        error: error.message
      });
    }
  }
  
  // קבלת חברי הקבוצה
  async getGroupMembers(req, res) {
    try {
      const { id } = req.params;
      
      const group = await Group.findById(id).populate('members.userId', 'name email profilePic');
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: group.members
      });
    } catch (error) {
      console.error('Error fetching group members:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch group members',
        error: error.message
      });
    }
  }
  
  // הוספת חבר לקבוצה
  async addMember(req, res) {
    try {
      const { id } = req.params;
      const { userId, role = 'member' } = req.body;
      
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({
          success: false, 
          message: 'Group not found'
        });
      }
      
      // בדיקה האם המשתמש כבר קיים בקבוצה
      const existingMember = group.members.find(
        member => member.userId.toString() === userId
      );
      
      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'User is already a member of this group'
        });
      }
      
      // הוספת המשתמש לקבוצה
      group.members.push({
        userId,
        role,
        joinDate: new Date()
      });
      
      await group.save();
      
      // עדכון המשתמש
      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { groups: id } }
      );
      
      // הזמנת המשתמש לקבוצת ה-WhatsApp
      const user = await User.findById(userId);
      if (user && group.whatsappId && user.phoneNumber) {
        await WhatsAppService.inviteToGroup(group.whatsappId, user.phoneNumber);
      }
      
      res.status(200).json({
        success: true,
        message: 'Member added successfully',
        data: {
          userId,
          role,
          joinDate: new Date()
        }
      });
    } catch (error) {
      console.error('Error adding member to group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add member to group',
        error: error.message
      });
    }
  }
  
  // הסרת חבר מהקבוצה
  async removeMember(req, res) {
    try {
      const { id, userId } = req.params;
      
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }
      
      // הסרת המשתמש מהקבוצה
      const memberIndex = group.members.findIndex(
        member => member.userId.toString() === userId
      );
      
      if (memberIndex === -1) {
        return res.status(400).json({
          success: false,
          message: 'User is not a member of this group'
        });
      }
      
      group.members.splice(memberIndex, 1);
      await group.save();
      
      // עדכון המשתמש
      await User.findByIdAndUpdate(
        userId,
        { $pull: { groups: id } }
      );
      
      // הסרת המשתמש מקבוצת ה-WhatsApp
      const user = await User.findById(userId);
      if (user && group.whatsappId && user.phoneNumber) {
        await WhatsAppService.removeFromGroup(group.whatsappId, user.phoneNumber);
      }
      
      res.status(200).json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      console.error('Error removing member from group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove member from group',
        error: error.message
      });
    }
  }
  
  // עדכון תפקיד חבר בקבוצה
  async updateMemberRole(req, res) {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;
      
      if (!['member', 'moderator', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be one of: member, moderator, admin'
        });
      }
      
      // עדכון תפקיד המשתמש
      const group = await Group.findOneAndUpdate(
        { _id: id, 'members.userId': userId },
        { $set: { 'members.$.role': role } },
        { new: true }
      );
      
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group or member not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: `Member role updated to ${role} successfully`,
        data: group.members.find(m => m.userId.toString() === userId)
      });
    } catch (error) {
      console.error('Error updating member role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update member role',
        error: error.message
      });
    }
  }
  
  // קבלת הודעות הקבוצה
  async getGroupMessages(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }
      
      // בדיקה אם המשתמש הנוכחי הוא חבר בקבוצה
      const isMember = group.members.some(
        member => member.userId.toString() === req.user._id.toString()
      );
      
      if (!isMember && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this group\'s messages'
        });
      }
      
      // שליפת הודעות הקבוצה
      const messages = await Message.find({ groupId: id })
        .sort({ sentAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('senderId', 'name profilePic');
      
      const total = await Message.countDocuments({ groupId: id });
      
      res.status(200).json({
        success: true,
        data: {
          messages: messages.reverse(),
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching group messages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch group messages',
        error: error.message
      });
    }
  }
  
  // שליחת הודעה לקבוצה
  async sendMessage(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const senderId = req.user._id;
      
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }
      
      // בדיקה אם המשתמש הנוכחי הוא חבר בקבוצה
      const isMember = group.members.some(
        member => member.userId.toString() === senderId.toString()
      );
      
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to send messages to this group'
        });
      }
      
      // יצירת הודעה חדשה
      const newMessage = new Message({
        groupId: id,
        senderId,
        content,
        sentAt: new Date()
      });
      
      await newMessage.save();
      
      // שליחת ההודעה דרך WhatsApp
      const sender = await User.findById(senderId);
      await WhatsAppService.sendGroupMessage(
        group.whatsappId,
        content,
        sender.name
      );
      
      res.status(201).json({
        success: true,
        data: newMessage,
        message: 'Message sent successfully'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: error.message
      });
    }
  }
  
  // קבלת סטטיסטיקות של הקבוצה
  async getGroupStatistics(req, res) {
    try {
      const { id } = req.params;
      
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }
      
      // שליפת סטטיסטיקות
      const messagesCount = await Message.countDocuments({ groupId: id });
      const activeMembers = await Message.distinct('senderId', { groupId: id });
      const messagesByDay = await Message.aggregate([
        { $match: { groupId: id } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$sentAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);
      
      // סטטיסטיקות פעילות חברים
      const memberActivity = await Promise.all(
        group.members.map(async member => {
          const memberMessages = await Message.countDocuments({
            groupId: id,
            senderId: member.userId
          });
          
          const memberInfo = await User.findById(member.userId, 'name profilePic');
          
          return {
            userId: member.userId,
            name: memberInfo ? memberInfo.name : 'Unknown User',
            profilePic: memberInfo ? memberInfo.profilePic : null,
            messageCount: memberMessages,
            activityPercentage: messagesCount > 0 ? 
              (memberMessages / messagesCount) * 100 : 0
          };
        })
      );
      
      res.status(200).json({
        success: true,
        data: {
          totalMessages: messagesCount,
          totalMembers: group.members.length,
          activeMembers: activeMembers.length,
          participationRate: group.members.length > 0 ? 
            (activeMembers.length / group.members.length) * 100 : 0,
          messagesByDay,
          memberActivity
        }
      });
    } catch (error) {
      console.error('Error fetching group statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch group statistics',
        error: error.message
      });
    }
  }
  
  // קבלת נתוני פעילות הקבוצה
  async getGroupActivity(req, res) {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;
      
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));
      
      // שליפת נתוני פעילות
      const messagesByDay = await Message.aggregate([
        {
          $match: {
            groupId: id,
            sentAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$sentAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);
      
      // מילוי ימים חסרים
      const fullActivityData = [];
      const currentDate = new Date(startDate);
      const endDate = new Date();
      
      while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        const existingData = messagesByDay.find(item => item._id === dateString);
        
        fullActivityData.push({
          date: dateString,
          count: existingData ? existingData.count : 0
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      res.status(200).json({
        success: true,
        data: fullActivityData
      });
    } catch (error) {
      console.error('Error fetching group activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch group activity',
        error: error.message
      });
    }
  }
  
  // קבלת קבוצות מומלצות למשתמש
  async getRecommendedGroups(req, res) {
    try {
      const userId = req.user._id;
      
      // שליפת קבוצות שהמשתמש כבר חבר בהן
      const user = await User.findById(userId);
      const userGroups = await Group.find({ 'members.userId': userId });
      
      // שליפת ההמלצות מהמנוע התואם
      const recommendations = await MatchingService.getGroupRecommendationsForUser(
        userId,
        userGroups.map(g => g._id)
      );
      
      res.status(200).json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Error fetching recommended groups:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recommended groups',
        error: error.message
      });
    }
  }
  
  // קבלת קבוצות לפי עיר
  async getGroupsByCity(req, res) {
    try {
      const { city } = req.params;
      
      const groups = await Group.find({ city: new RegExp(city, 'i') });
      
      res.status(200).json({
        success: true,
        data: groups
      });
    } catch (error) {
      console.error('Error fetching city groups:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch city groups',
        error: error.message
      });
    }
  }
  
  // קבלת קבוצות לפי סוג
  async getGroupsByType(req, res) {
    try {
      const { type } = req.params;
      
      const groups = await Group.find({ type });
      
      res.status(200).json({
        success: true,
        data: groups
      });
    } catch (error) {
      console.error('Error fetching groups by type:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch groups by type',
        error: error.message
      });
    }
  }
  
  async matchUserToGroup(req, res) {
    try {
      const { userId } = req.params;
      
      // מציאת קבוצה מתאימה למשתמש
      const bestMatch = await MatchingService.findBestGroupMatch(userId);
      
      if (bestMatch) {
        // נמצאה התאמה טובה לקבוצה קיימת
        const user = await User.findById(userId);
        
        // הוספת המשתמש לקבוצה
        await Group.findByIdAndUpdate(bestMatch._id, {
          $push: { 
            members: {
              userId,
              role: 'member'
            }
          }
        });
        
        // עדכון פרטי המשתמש
        await User.findByIdAndUpdate(userId, {
          $push: { groups: bestMatch._id }
        });
        
        // הזמנת המשתמש לקבוצה
        await WhatsAppService.inviteToGroup(bestMatch.whatsappId, user.phoneNumber);
        
        res.status(200).json({ 
          matched: true, 
          group: bestMatch,
          created: false
        });
      } else {
        // יצירת קבוצה חדשה
        const user = await User.findById(userId);
        
        // מציאת משתמשים דומים
        const similarUsers = await MatchingService.findSimilarUsers(userId, 4);
        
        // הצעה לקבוצה חדשה
        const groupSuggestion = await MatchingService.suggestNewGroup(user, similarUsers);
        
        // יצירת הקבוצה
        const phoneNumbers = [user.phoneNumber, ...similarUsers.map(u => u.phoneNumber)];
        const whatsappGroup = await WhatsAppService.createGroup(
          groupSuggestion.name, 
          phoneNumbers
        );
        
        // שמירת הקבוצה במסד הנתונים
        const newGroup = new Group({
          name: groupSuggestion.name,
          whatsappId: whatsappGroup.id,
          description: groupSuggestion.description || '',
          type: groupSuggestion.type,
          members: [user._id, ...similarUsers.map(u => u._id)].map(id => ({
            userId: id,
            role: 'member'
          })),
          characteristics: groupSuggestion.characteristics
        });
        
        await newGroup.save();
        
        // עדכון פרטי המשתמשים
        const allUserIds = [userId, ...similarUsers.map(u => u._id)];
        await User.updateMany(
          { _id: { $in: allUserIds } },
          { $push: { groups: newGroup._id } }
        );
        
        // שליחת הודעת פתיחה לקבוצה
        const welcomeMessage = await this.generateWelcomeMessage(newGroup);
        await WhatsAppService.sendGroupMessage(whatsappGroup.id, welcomeMessage);
        
        res.status(201).json({
          matched: true,
          group: newGroup,
          created: true
        });
      }
    } catch (error) {
      console.error('Error matching user to group:', error);
      res.status(500).json({ message: 'Failed to match user', error: error.message });
    }
  }
  
  async monitorGroupActivity(groupId) {
    // ניטור פעילות בקבוצה ומדידת מדדים
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }
      
      // שליפת נתוני פעילות מ-WhatsApp
      const activityData = await WhatsAppService.getGroupActivity(group.whatsappId);
      
      // ניתוח הפעילות ועדכון מדדים
      const updatedMetrics = {
        activityLevel: this.calculateActivityLevel(activityData),
        messageCount: activityData.messageCount,
        positivityScore: await this.analyzeGroupSentiment(activityData.messages),
        lastMessage: activityData.lastMessageTimestamp
      };
      
      // עדכון הקבוצה במסד הנתונים
      await Group.findByIdAndUpdate(groupId, {
        $set: { metrics: updatedMetrics }
      });
      
      return updatedMetrics;
    } catch (error) {
      console.error('Error monitoring group activity:', error);
      throw error;
    }
  }
  
  calculateActivityLevel(activityData) {
    // חישוב רמת פעילות לפי מספר הודעות ומשתתפים
    const totalMessages = activityData.messageCount;
    const activeMembers = activityData.activeMembers;
    const totalMembers = activityData.totalMembers;
    
    // נוסחה לחישוב רמת הפעילות (0-1)
    const messagesPerMember = totalMessages / Math.max(totalMembers, 1);
    const participationRate = activeMembers / Math.max(totalMembers, 1);
    
    return (0.7 * Math.min(messagesPerMember / 10, 1)) + (0.3 * participationRate);
  }
  
  async analyzeGroupSentiment(messages) {
    // ניתוח רגשי של הודעות הקבוצה באמצעות AI
    try {
      const sampleMessages = messages.slice(-20); // דגימת 20 ההודעות האחרונות
      const sentimentAnalysis = await AIService.analyzeSentiment(sampleMessages);
      return sentimentAnalysis.positivityScore; // ציון בין 0 ל-1
    } catch (error) {
      console.error('Error analyzing group sentiment:', error);
      return 0.5; // ערך ברירת מחדל
    }
  }
}

module.exports = new GroupController();
