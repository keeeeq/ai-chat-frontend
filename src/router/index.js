import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("../views/Home.vue"),
  },
  {
    path: "/chat",
    name: "Chat",
    component: () => import("../views/Chat.vue"),
  },
  {
    path: "/game-mode",
    name: "GameMode",
    component: () => import("../views/GameMode.vue"),
  },
  {
    path: "/novel-service",
    name: "NovelService",
    component: () => import("../views/NovelService.vue"),
  },
  {
    path: "/project4",
    name: "Project4",
    component: () => import("../views/Project4.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
