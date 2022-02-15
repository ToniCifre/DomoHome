import React from 'react';

import Box from "@material-ui/core/Box";
import Container from "@material-ui/core/Container";
import Typography from "@material-ui/core/Typography";


const Error = props  => {

    let errorType = ""
    let errorMessage = ""
    try {
        errorType = props.location.state.errorType
        errorMessage = props.location.state.errorMessage
    } catch (err) {
        window.location.href = '/';
    }

    return (
        <Container maxWidth={"md"} disableGutters >
            <Box bgcolor="background.darker" boxShadow={2} borderRadius="20px" style={{padding: '30px 1vw 50px 1vw', marginTop: '3vh', }}>
                <Typography variant="h4" gutterBottom align={"center"}>
                    {errorType}
                </Typography>
                {errorMessage === Array ?
                    errorMessage.map((text) =>
                        <Typography variant="body1" gutterBottom align={"center"}>
                            {text}
                        </Typography>
                    ):
                    <Typography variant="body1" gutterBottom align={"center"}>
                        {errorMessage}
                    </Typography>
                }
            </Box>
        </Container>
    )
}

export default Error;
