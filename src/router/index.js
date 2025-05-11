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
    path: "/project2",
    name: "Project2",
    component: () => import("../views/Project2.vue"),
  },
  {
    path: "/project3",
    name: "Project3",
    component: () => import("../views/Project3.vue"),
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
