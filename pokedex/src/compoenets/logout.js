import { GoogleLogout } from 'react-google-login';
const clientId = "809188169045-fk7d1hqogk3fbm3692fpognmj967171p.apps.googleusercontent.com";
function Logout() {
const onSuccess = () => {
console.log("Log out successfull!");
}
return (
<div id="signOutButton">
<GoogleLogout
clientId={clientId}
buttonText={"Logout"}
onLogoutSuccess={onSuccess}
/>
</div>
)
}
T
export default Logout;