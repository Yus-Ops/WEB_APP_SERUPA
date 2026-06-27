import { createRouter, createWebHistory } from "vue-router"
import LandingView from "@/views/LandingView.vue"
import CheckView from "@/views/CheckView.vue"

const routes = [
  { path: "/", name: "home", component: LandingView, meta: { title: "Beranda" } },
  { path: "/cek", name: "check", component: CheckView, meta: { title: "Cek Judul" } },
  {
    path: "/peta",
    name: "map",
    component: () => import("@/views/MapView.vue"),
    meta: { title: "Peta Tema" },
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const base = "Serupa"
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base
})

export default router
