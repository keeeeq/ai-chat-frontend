<template>
  <div class="project-container">
    <el-header>
      <div class="header-content">
        <h1 class="header-title" @click="goToHome">AI 工具导航站</h1>
        <el-tag type="success" effect="dark">游戏模式</el-tag>
      </div>
    </el-header>
    <div class="content">
      <div class="chat-container">
        <!-- 好感度显示区域 -->
        <div class="favorability-container">
          <div class="favorability-label">好感度</div>
          <el-progress
            :percentage="favorability"
            :color="favorabilityColor"
            :stroke-width="10"
            :show-text="false"
          />
          <div class="favorability-value" :class="favorabilityTextClass">
            {{ favorability }}
          </div>
        </div>
        <div class="chat-messages" ref="messagesContainer">
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="[
              'message',
              message.type === 'user' ? 'user-message' : 'ai-message',
            ]"
          >
            <div class="message-avatar">
              <el-avatar :size="50">
                <el-icon v-if="message.type === 'user'"><User /></el-icon>
                <el-icon v-else><ChatDotRound /></el-icon>
              </el-avatar>
            </div>
            <div class="message-content-wrapper">
              <div class="message-content">
                <div class="message-text">{{ message.content }}</div>
                <div class="message-time">
                  {{ formatTime(message.timestamp) }}
                </div>
              </div>
            </div>
          </div>
          <div v-if="loading" class="loading-message">
            <el-avatar :size="50">
              <el-icon><ChatDotRound /></el-icon>
            </el-avatar>
            <div class="loading-content">
              <div class="loading-text">AI 正在思考...</div>
              <el-skeleton :rows="1" animated />
            </div>
          </div>
        </div>
        <div class="chat-input">
          <el-input
            v-model="userInput"
            type="textarea"
            :rows="4"
            placeholder="来和我一起玩游戏吧..."
            @keyup.enter.ctrl="sendMessage"
            resize="none"
          />
          <div class="input-actions">
            <el-tooltip content="Ctrl + Enter 发送" placement="top">
              <el-button
                type="success"
                @click="sendMessage"
                :loading="loading"
                :disabled="!userInput.trim()"
              >
                <el-icon><Position /></el-icon>
                发送
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>
    <!-- 好感度变化提示 -->
    <transition name="fade">
      <div
        v-if="showFavorabilityChange"
        class="favorability-change"
        :class="favorabilityChangeClass"
      >
        {{ favorabilityChange > 0 ? "+" : "" }}{{ favorabilityChange }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { ElMessage } from "element-plus";
import { User, ChatDotRound, Position } from "@element-plus/icons-vue";
import dayjs from "dayjs";

const router = useRouter();
const userInput = ref("");
const loading = ref(false);
const messagesContainer = ref(null);
const messages = ref([]);
const chatId = ref(Date.now().toString());
const favorability = ref(50); // 修改初始好感度为50
const showFavorabilityChange = ref(false);
const favorabilityChange = ref(0);

// 计算好感度颜色
const favorabilityColor = computed(() => {
  if (favorability.value >= 80) return "#67C23A";
  if (favorability.value <= 30) return "#F56C6C";
  return "#E6A23C";
});

// 计算好感度文字颜色类
const favorabilityTextClass = computed(() => {
  if (favorability.value >= 80) return "text-success";
  if (favorability.value <= 30) return "text-danger";
  return "text-warning";
});

// 计算好感度变化提示的类
const favorabilityChangeClass = computed(() => {
  return favorabilityChange.value > 0 ? "change-positive" : "change-negative";
});

// 解析AI回复中的好感度变化
const parseFavorabilityChange = (content) => {
  // 首先尝试匹配"好感+/-数字"格式
  const changeMatch = content.match(/好感([+-]\d+)/);
  if (changeMatch) {
    return parseInt(changeMatch[1]);
  }

  // 如果没有匹配到变化值，则尝试匹配当前好感度
  const currentMatch = content.match(/当前好感度：(\d+)\/\d+/);
  if (currentMatch) {
    const newFavorability = parseInt(currentMatch[1]);
    const currentFavorability = favorability.value;
    return newFavorability - currentFavorability;
  }

  return 0;
};

// 显示好感度变化动画
const showFavorabilityChangeAnimation = (change) => {
  favorabilityChange.value = change;
  showFavorabilityChange.value = true;
  setTimeout(() => {
    showFavorabilityChange.value = false;
  }, 2000);
};

const formatTime = (timestamp) => {
  return dayjs(timestamp).format("HH:mm:ss");
};

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const sendMessage = async () => {
  if (!userInput.value.trim() || loading.value) return;

  // 检查是否是重启命令
  if (userInput.value.trim() === "重启") {
    favorability.value = 50; // 重置好感度为50
    const resetMessage = {
      type: "ai",
      content: "已重置好感度为50！",
      timestamp: new Date(),
    };
    messages.value.push({
      type: "user",
      content: userInput.value,
      timestamp: new Date(),
    });
    messages.value.push(resetMessage);
    userInput.value = "";
    await scrollToBottom();
    return;
  }

  const userMessage = {
    type: "user",
    content: userInput.value,
    timestamp: new Date(),
  };

  messages.value.push(userMessage);
  const prompt = userInput.value;
  userInput.value = "";
  loading.value = true;

  try {
    const response = await axios.get(`/ai/game`, {
      params: {
        prompt: prompt,
        chatId: chatId.value,
      },
    });

    const aiMessage = {
      type: "ai",
      content: response.data,
      timestamp: new Date(),
    };

    messages.value.push(aiMessage);

    // 解析并更新好感度
    const change = parseFavorabilityChange(response.data);
    if (change !== 0) {
      favorability.value = Math.max(
        1,
        Math.min(100, favorability.value + change)
      );
      showFavorabilityChangeAnimation(change);
    }

    await scrollToBottom();
  } catch (error) {
    console.error("发送消息失败:", error);
    ElMessage.error("发送消息失败，请重试");
  } finally {
    loading.value = false;
  }
};

const goToHome = () => {
  router.push("/");
};

onMounted(() => {
  messages.value.push({
    type: "ai",
    content:
      '你好！我是图书管理员莉莉，很高兴见到你！\n提示：输入"重启"可以重置好感度。',
    timestamp: new Date(),
  });
});
</script>

<style scoped>
.project-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.el-header {
  background: linear-gradient(135deg, #67c23a 0%, #95d475 100%);
  color: white;
  padding: 0 40px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  height: 80px;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-content h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
}

.content {
  padding: 20px;
  height: calc(100vh - 80px);
}

.chat-container {
  max-width: 1000px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  display: flex;
  margin-bottom: 20px;
  align-items: flex-start;
}

.message-avatar {
  position: relative;
  margin-right: 12px;
}

.message-content-wrapper {
  flex: 1;
}

.message-content {
  background: #f4f4f5;
  padding: 12px 16px;
  border-radius: 8px;
  max-width: 80%;
}

.user-message {
  flex-direction: row-reverse;
}

.user-message .message-avatar {
  margin-right: 0;
  margin-left: 12px;
}

.user-message .message-content {
  background: #67c23a;
  color: white;
}

.message-text {
  font-size: 16px;
  line-height: 1.5;
  word-break: break-word;
}

.message-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.user-message .message-time {
  color: #e1f3d8;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #ebeef5;
}

.input-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.loading-message {
  display: flex;
  margin-bottom: 20px;
  align-items: flex-start;
}

.loading-content {
  flex: 1;
  background: #f4f4f5;
  padding: 12px 16px;
  border-radius: 8px;
  max-width: 80%;
}

.loading-text {
  margin-bottom: 8px;
  color: #909399;
}

.header-title {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  padding: 5px 10px;
  border-radius: 4px;
}

.header-title:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.header-title:active {
  transform: scale(0.98);
}

.favorability-container {
  padding: 16px;
  background: white;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  gap: 12px;
}

.favorability-label {
  font-size: 14px;
  color: #909399;
  min-width: 50px;
}

.favorability-value {
  font-size: 16px;
  font-weight: bold;
  min-width: 40px;
  text-align: right;
}

.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

.text-warning {
  color: #e6a23c;
}

.favorability-change {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  font-weight: bold;
  padding: 10px 20px;
  border-radius: 8px;
  z-index: 1000;
}

.change-positive {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
}

.change-negative {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s, transform 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -60%);
}
</style>
