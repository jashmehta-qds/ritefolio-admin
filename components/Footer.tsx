"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FaInstagram, FaTwitter } from "react-icons/fa";
import { Divider } from "@heroui/divider";
import { footerLinks } from "@/data/footer";
import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/client";

interface NavLinkProps {
  link: string;
  label?: string;
  icon?: React.ReactElement;
}

const socialLinks = [
  {
    platform: "Instagram",
    icon: <FaInstagram />,
    link: siteConfig.links.instagram,
  },
  {
    platform: "Twitter",
    icon: <FaTwitter />,
    link: siteConfig.links.twitter,
  },
];

const Footer = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // Don't render footer if user is logged in
  if (isAuthenticated) {
    return null;
  }

  const NavLink = ({ link, label, icon }: NavLinkProps) => {
    return (
      <a
        href={link}
        className="flex items-center gap-2 mt-1 text-default-400 hover:text-default-800"
      >
        {icon}
        {label}
      </a>
    );
  };

  return (
    <footer className="min-w-[415px] px-4">
      <div className="border-t-1 border-default py-4">
        <div className="flex flex-col lg:flex-row gap-2 lg-gap-0">
          <div className="flex items-center gap-2 justify-center lg:justify-start text-default-400 cursor-pointer w-full">
            {footerLinks.map((item, index) => (
              <Link
                key={item.href}
                className={`flex gap-2 whitespace-nowrap hover:text-default-800 text-default-400`}
                href={item.href}
                target="_blank"
              >
                {item.label}
                {index < footerLinks.length - 1 && (
                  <Divider className="h-6" orientation="vertical" />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-center text-default-400 w-full">
            &copy; {new Date().getFullYear()} Powered by Quantech Data Science
            LLP
          </div>

          <div className="flex items-center justify-center lg:justify-end gap-3 w-full">
            <div className="-mt-1">
              <NavLink
                label="support@capito.in"
                link="mailto:support@capito.in"
              />
            </div>
            {socialLinks.map((item, index) => (
              <NavLink key={index} icon={item.icon} link={item.link} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
