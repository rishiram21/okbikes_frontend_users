import React from "react";
import {
  FaFacebookF,
  FaYoutube,
  FaInstagram,
  FaLinkedinIn,
} from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-10">
      <div className="container mx-auto px-4">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-bold mb-3">About Us</h3>
            <p className="text-sm leading-6">
              We provide the best bike rental service, ensuring a smooth and
              adventurous ride experience. Your safety and comfort are our
              priority!
            </p>
          </div>

          {/* Quick Links Section */}
          <div>
            <h3 className="text-lg font-bold mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-sm hover:text-gray-400">
                  Home
                </a>
              </li>
              {/* <li>
                <a href="/about" className="text-sm hover:text-gray-400">
                  About Us
                </a>
              </li>
              <li>
                <a href="/services" className="text-sm hover:text-gray-400">
                  Services
                </a>
              </li> */}
              <li>
                <a href="/contactus" className="text-sm hover:text-gray-400">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info Section */}
          <div>
            <h3 className="text-lg font-bold mb-3">Contact Info</h3>
            <ul className="space-y-2">
              <li className="text-sm">📍 Koregaon Park, Pune, India</li>
              <li className="text-sm">📞 +91 7767060670/ +91 9112412191</li>
              <li className="text-sm">✉ okloadexpress11@gmail.com</li>
            </ul>
          </div>

          {/* Social Media Section */}
          <div>
            <h3 className="text-lg font-bold mb-3">Follow Us</h3>
            <div className="flex gap-4">
              <a href="#" className="hover:text-gray-400">
                <FaFacebookF size={20} />
              </a>
              <a href="#" className="hover:text-gray-400">
                <FaYoutube size={20} />
              </a>
              <a href="#" className="hover:text-gray-400">
                <FaInstagram size={20} />
              </a>
              <a href="#" className="hover:text-gray-400">
                <FaLinkedinIn size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-8 pt-4 text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} Bike Rental Service. All Rights
            Reserved.
          </p>
          <p className="text-xs mt-1">
            Designed for bike enthusiasts who love adventure.
          </p>
          <p className="text-xs mt-1">Designed by Eptiq Technologies</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
