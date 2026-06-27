import { createRouter, createWebHistory } from "vue-router"
import CheckView from "@/views/CheckView.vue"

const routes = [
  { path: "/", name: "check", component: CheckView, meta: { title: "Cek Judul" } },
  {
    path: "/peta",
    name: "map",
    component: () => import("@/views/MapView.vue"),
    meta: { title: "Peta Korpus" },
  },
  {
    path: "/admin",
    name: "admin",
    component: () => import("@/views/AdminView.vue"),
    meta: { title: "Admin" },
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const base = "Observatorium Skripsi"
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base
})

export default router
