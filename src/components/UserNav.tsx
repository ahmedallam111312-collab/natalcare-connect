import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // <-- أضفنا AvatarImage
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/authStore";
import { LogOut } from "lucide-react";
import { auth } from "@/services/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function UserNav() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login"); 
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const role = (user as any)?.role || "patient";
  let bgClass = "bg-primary text-primary-foreground";
  if (role === "admin") bgClass = "bg-accent text-accent-foreground";
  if (role === "nurse") bgClass = "bg-secondary text-secondary-foreground";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full border border-border/50">
          <Avatar className="h-8 w-8">
            <AvatarImage src={(user as any)?.photoURL} className="object-cover" />
            <AvatarFallback className={`${bgClass} text-xs font-bold`}>
              {user?.displayName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 shadow-xl rounded-xl" align="end" forceMount dir="rtl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none">{user?.displayName || "مستخدم"}</p>
            <p className="text-xs leading-none text-muted-foreground mt-1">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout} 
          className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
        >
          <LogOut className="ml-2 h-4 w-4" />
          <span>تسجيل الخروج</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}